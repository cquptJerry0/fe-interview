import json
import math
import re
import unittest
from collections import Counter
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
CASE = ROOT / "assets" / "cases" / "vimocli-release-four-lanes"


def local_links(source):
    content = source.read_text(encoding="utf-8")
    content = re.sub(r"(?ms)^(`{3,}|~{3,})[^\n]*\n.*?^\1\s*$", "", content)
    for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", content):
        if re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", target):
            continue
        relative = unquote(target.split("#", 1)[0])
        if relative:
            yield (source.parent / relative).resolve()


def text_value(node):
    text = node.get("text", "")
    return text.get("text", "") if isinstance(text, dict) else text


class SkillIntegrityTest(unittest.TestCase):
    def test_local_document_links_resolve(self):
        for source in ROOT.rglob("*.md"):
            for target in local_links(source):
                with self.subTest(source=source.relative_to(ROOT), target=target):
                    self.assertTrue(target.exists())

    def test_workflow_and_guides_are_reachable_from_entrypoint(self):
        pending = [ROOT / "SKILL.md"]
        visited = set()
        while pending:
            source = pending.pop()
            if source in visited:
                continue
            visited.add(source)
            pending.extend(
                target for target in local_links(source)
                if target.suffix == ".md" and target.is_file() and target not in visited
            )
        for folder in ("workflow", "guides"):
            for source in (ROOT / folder).glob("*.md"):
                with self.subTest(source=source.name):
                    self.assertIn(source, visited)

    def test_case_native_nodes_have_unique_ids_and_valid_bound_edges(self):
        nodes = json.loads((CASE / "board.openapi.json").read_text())["nodes"]
        ids = [node["id"] for node in nodes]
        self.assertEqual(len(ids), len(set(ids)))
        objects = {node["id"] for node in nodes if node["type"] != "connector"}
        connectors = [node for node in nodes if node["type"] == "connector"]
        self.assertTrue(connectors)
        for node in nodes:
            with self.subTest(node=node["id"]):
                self.assertIn(node["type"], {"composite_shape", "text_shape", "connector"})
                for key in ("x", "y", "width", "height"):
                    self.assertTrue(math.isfinite(node[key]))
                self.assertGreaterEqual(node["width"], 0)
                self.assertGreaterEqual(node["height"], 0)
        for node in connectors:
            for side in ("start", "end"):
                with self.subTest(node=node["id"], side=side):
                    anchor = node["connector"][side]["attached_object"]
                    self.assertIn(anchor["id"], objects)
                    for coordinate in ("x", "y"):
                        self.assertGreaterEqual(anchor["position"][coordinate], 0)
                        self.assertLessEqual(anchor["position"][coordinate], 1)

    def test_case_conversion_preserves_node_text_and_shape_mapping(self):
        dsl = json.loads((CASE / "board.json").read_text())["nodes"]
        native = json.loads((CASE / "board.openapi.json").read_text())["nodes"]
        expected = Counter(text_value(n) for n in dsl if text_value(n))
        actual = Counter(text_value(n) for n in native if text_value(n))
        self.assertEqual(actual, expected)
        decisions = json.loads((CASE / "decisions.json").read_text())
        available = {n.get("composite_shape", {}).get("type") for n in native}
        for kind, shape in decisions["shape_rules"].items():
            with self.subTest(kind=kind):
                self.assertIn(shape, available)


if __name__ == "__main__":
    unittest.main()
