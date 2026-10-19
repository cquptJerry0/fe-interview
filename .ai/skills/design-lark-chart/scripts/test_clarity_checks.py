#!/usr/bin/env python3
"""Regression tests for geometry checks and content-driven style gates."""

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from check_geometry import check
from lint_premium_style import collect_svg, validate
from lint_svg_quality import parse_svg, validate_mode

HERE = Path(__file__).resolve().parent


def node(identifier, x, y, width=40, height=40):
    return {"id": identifier, "x": x, "y": y, "width": width, "height": height}


def edge(identifier, source, target, points, source_port="right", target_port="left"):
    return {"id": identifier, "from": source, "to": target, "from_port": source_port,
            "to_port": target_port, "points": points}


class GeometryTests(unittest.TestCase):
    def setUp(self):
        self.graph = {"nodes": [node("a", 0, 0), node("b", 200, 0)],
                      "edges": [edge("e", "a", "b", [[40, 20], [200, 20]])]}

    def codes(self, data=None):
        return {item["code"] for item in check(self.graph if data is None else data)["errors"]}

    def test_simple_graph(self):
        result = check(self.graph)
        self.assertTrue(result["ok"])
        self.assertEqual([], result["warnings"])

    def test_empty_graph_does_not_invent_density_requirement(self):
        self.assertTrue(check({"nodes": [node("a", 0, 0)]})["ok"])

    def test_container_may_contain_nodes(self):
        self.graph["containers"] = [node("scope", -20, -20, 300, 100)]
        self.assertTrue(check(self.graph)["ok"])

    def test_node_overlap(self):
        self.graph["nodes"].append(node("c", 10, 10))
        self.assertIn("node-overlap", self.codes())

    def test_touching_nodes_are_not_overlapping(self):
        self.graph["nodes"].append(node("c", 0, 40))
        self.assertNotIn("node-overlap", self.codes())

    def test_duplicate_ids_across_collections(self):
        self.graph["edges"][0]["id"] = "a"
        self.assertIn("duplicate-id", self.codes())

    def test_invalid_bounds(self):
        for value in (0, -1, float("inf"), float("nan"), True, "40"):
            with self.subTest(value=value):
                graph = copy.deepcopy(self.graph)
                graph["nodes"][0]["width"] = value
                self.assertIn("invalid-bounds", self.codes(graph))

    def test_schema_errors_do_not_crash(self):
        for data in ([], {"nodes": 3}, {"nodes": [None]}, {"edges": [{"id": "e", "from": {}}]}):
            self.assertFalse(check(data)["ok"])

    def test_unknown_endpoint(self):
        self.graph["edges"][0]["to"] = "missing"
        self.assertIn("unknown-node", self.codes())

    def test_invalid_points(self):
        for points in ([[40, 20]], [[40, 20], [float("nan"), 20]], [[40, 20], [200]]):
            self.graph["edges"][0]["points"] = points
            self.assertIn("invalid-points", self.codes())

    def test_wrong_port(self):
        self.graph["edges"][0]["from_port"] = "top"
        self.assertIn("port-mismatch", self.codes())

    def test_unknown_port(self):
        self.graph["edges"][0]["from_port"] = "center"
        self.assertIn("invalid-port", self.codes())

    def test_diagonal(self):
        self.graph["edges"][0]["points"] = [[40, 20], [100, 30], [200, 20]]
        self.assertIn("non-orthogonal", self.codes())

    def test_zero_segment(self):
        self.graph["edges"][0]["points"].insert(1, [40, 20])
        self.assertIn("zero-segment", self.codes())

    def test_edge_through_unrelated_node(self):
        self.graph["nodes"].append(node("c", 100, 0))
        self.assertIn("edge-through-node", self.codes())

    def test_edge_cannot_enter_its_source(self):
        self.graph["edges"][0]["points"] = [[40, 20], [20, 20], [20, -20], [200, -20], [200, 20]]
        self.assertIn("edge-through-node", self.codes())

    def test_label_on_own_edge_allowed(self):
        self.graph["labels"] = [{**node("label", 90, 10, 30, 20), "edge_id": "e"}]
        self.assertTrue(check(self.graph)["ok"])

    def test_label_unknown_edge(self):
        self.graph["labels"] = [{**node("label", 90, 10, 30, 20), "edge_id": "missing"}]
        self.assertIn("unknown-edge", self.codes())

    def test_label_over_node(self):
        self.graph["labels"] = [{**node("label", 10, 10), "edge_id": "e"}]
        self.assertIn("label-over-node", self.codes())

    def test_label_overlap(self):
        self.graph["labels"] = [{**node("l1", 80, 60), "edge_id": "e"},
                                {**node("l2", 90, 60), "edge_id": "e"}]
        self.assertIn("label-overlap", self.codes())

    def crossing_graph(self):
        self.graph["nodes"].extend([node("c", 80, -100), node("d", 80, 100)])
        self.graph["edges"].append(edge("f", "c", "d", [[100, -60], [100, 100]], "bottom", "top"))

    def test_crossing_is_warning_not_silently_accepted(self):
        self.crossing_graph()
        result = check(self.graph)
        self.assertTrue(result["ok"])
        self.assertIn("edge-crossing", {item["code"] for item in result["warnings"]})

    def test_label_obscures_other_edge(self):
        self.crossing_graph()
        self.graph["labels"] = [{**node("label", 90, 10, 30, 20), "edge_id": "e"}]
        self.assertIn("label-over-edge", self.codes())

    def test_true_fanout_shared_trunk(self):
        self.graph["nodes"].append(node("c", 200, 100))
        self.graph["edges"].append(edge("f", "a", "c", [[40, 20], [80, 20], [80, 120], [200, 120]]))
        result = check(self.graph)
        self.assertTrue(result["ok"])
        self.assertEqual([], result["warnings"])

    def test_true_merge_shared_trunk(self):
        self.graph["nodes"].append(node("c", 0, 100))
        self.graph["edges"].append(edge("f", "c", "b", [[40, 120], [100, 120], [100, 20], [200, 20]]))
        result = check(self.graph)
        self.assertTrue(result["ok"])
        self.assertEqual([], result["warnings"])

    def test_unrelated_edges_cannot_share_trunk(self):
        self.graph["nodes"].extend([node("c", 0, 100), node("d", 200, 100)])
        self.graph["edges"].append(edge("f", "c", "d", [[40, 120], [80, 120], [80, 20], [160, 20], [160, 120], [200, 120]]))
        self.assertIn("false-merge", self.codes())

    def test_same_source_does_not_excuse_opposing_trunk(self):
        self.graph["nodes"].append(node("c", 200, 100))
        self.graph["edges"].append(edge("f", "a", "c", [[40, 20], [80, 20], [80, -60], [180, -60], [180, 20], [100, 20], [100, 120], [200, 120]]))
        self.assertIn("false-merge", self.codes())

    def test_self_retrace(self):
        self.graph["edges"][0]["points"] = [[40, 20], [120, 20], [80, 20], [200, 20]]
        self.assertIn("self-overlap", self.codes())


class StyleTests(unittest.TestCase):
    def metrics(self, markup):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "diagram.svg"
            path.write_text('<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>')
            return collect_svg(path)

    def test_minimal_architecture_is_not_forced_to_expand(self):
        metrics = self.metrics('<rect fill="#ffffff"/><text>服务</text>')
        self.assertEqual([], validate("system-architecture", metrics, {"#ffffff"}))

    def test_unsupported_pattern_still_fails(self):
        self.assertTrue(validate("system-architecture", self.metrics('<pattern/>'), set()))

    def test_palette_is_still_enforced(self):
        self.assertTrue(validate("system-architecture", self.metrics('<rect fill="#123456"/>'), set()))

    def test_quadrant_requires_axes(self):
        metrics = self.metrics('<g data-role="quadrant"/>' * 4)
        self.assertTrue(validate("matrix-quadrant", metrics, set()))

    def test_monochrome_quadrants_do_not_need_five_rectangles(self):
        metrics = self.metrics('<g data-role="quadrant"/>' * 4 + '<text data-role="axis-label">轴</text>' * 2)
        self.assertEqual([], validate("matrix-quadrant", metrics, set()))

    def test_small_sketch_does_not_need_eight_cards(self):
        metrics = self.metrics('<path data-role="sketch-stroke"/>')
        self.assertEqual([], validate("sketch-architecture", metrics, set()))

    def test_small_information_graphics_do_not_need_decoration(self):
        cases = {
            "custom": '<rect/><text>单一职责</text>',
            "sankey": '<path data-role="sankey-flow"/><text>来源</text><text>去向</text>',
            "roadmap": '<line data-role="roadmap-axis"/><circle data-role="roadmap-milestone"/><text>发布</text>',
        }
        for mode, markup in cases.items():
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "diagram.svg"
                path.write_text('<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>')
                self.assertEqual([], validate_mode(mode, parse_svg(path)))

    def run_lark_lint(self, nodes):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "board.json"
            path.write_text(json.dumps({"version": 2, "nodes": nodes}))
            completed = subprocess.run([sys.executable, str(HERE / "lint_lark_style_architecture.py"), str(path)], capture_output=True, text=True)
            return completed.returncode, json.loads(completed.stdout)

    def test_lark_simple_nodes_no_layers_or_colors(self):
        code, result = self.run_lark_lint([{"id": "a", "type": "rect", "text": "服务", "height": "fit-content"}])
        self.assertEqual(0, code)
        self.assertTrue(result["ok"])

    def test_lark_unknown_reference_fails(self):
        code, result = self.run_lark_lint([{"type": "connector", "connector": {"from": "a", "to": "b"}}])
        self.assertEqual(1, code)
        self.assertFalse(result["ok"])

    def test_lark_no_arrow_and_explicit_points_are_legal(self):
        code, result = self.run_lark_lint([{"type": "connector", "connector": {
            "from": {"x": 0, "y": 0}, "to": {"x": 100, "y": 0}, "endArrow": "none"}}])
        self.assertEqual(0, code)
        self.assertTrue(result["ok"])


if __name__ == "__main__":
    unittest.main()
