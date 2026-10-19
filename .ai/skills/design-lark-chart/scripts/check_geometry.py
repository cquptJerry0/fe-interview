#!/usr/bin/env python3
"""Check renderer-derived rectangles, orthogonal connectors and label bounds.

This checks geometry, not business meaning. Bounding boxes are conservative for
nonrectangular shapes; crossings need visual review even when no error is found.
"""

from __future__ import annotations

import argparse
import json
import math
from itertools import combinations
from pathlib import Path

EPS = 1e-4
PORTS = {"left": (0, 0.5), "right": (1, 0.5), "top": (0.5, 0), "bottom": (0.5, 1)}


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def same(a, b):
    return abs(a[0] - b[0]) <= EPS and abs(a[1] - b[1]) <= EPS


def rect_overlap(a, b):
    return (min(a["x"] + a["width"], b["x"] + b["width"]) - max(a["x"], b["x"]) > EPS
            and min(a["y"] + a["height"], b["y"] + b["height"]) - max(a["y"], b["y"]) > EPS)


def axis(segment):
    a, b = segment
    return 0 if abs(a[1] - b[1]) <= EPS else 1


def hits_rect(segment, rect):
    # Open interiors allow an endpoint on its node boundary and labels beside lines.
    a, b = segment
    dim = axis(segment)
    fixed = 1 - dim
    lo = (rect["x"], rect["y"])
    hi = (rect["x"] + rect["width"], rect["y"] + rect["height"])
    return (lo[fixed] + EPS < a[fixed] < hi[fixed] - EPS
            and min(max(a[dim], b[dim]), hi[dim]) - max(min(a[dim], b[dim]), lo[dim]) > EPS)


def collinear_overlap(a, b):
    dim = axis(a)
    if dim != axis(b) or abs(a[0][1 - dim] - b[0][1 - dim]) > EPS:
        return False
    return min(max(p[dim] for p in a), max(p[dim] for p in b)) - max(
        min(p[dim] for p in a), min(p[dim] for p in b)) > EPS


def intersection(a, b):
    if axis(a) == axis(b):
        return None
    horizontal, vertical = (a, b) if axis(a) == 0 else (b, a)
    x, y = vertical[0][0], horizontal[0][1]
    if (min(p[0] for p in horizontal) - EPS <= x <= max(p[0] for p in horizontal) + EPS
            and min(p[1] for p in vertical) - EPS <= y <= max(p[1] for p in vertical) + EPS):
        return (x, y)
    return None


def check(data):
    errors, warnings = [], []

    def issue(code, ids, message, warning=False):
        target = warnings if warning else errors
        item = {"code": code, "ids": ids, "message": message}
        if item not in target:
            target.append(item)

    if not isinstance(data, dict):
        return {"ok": False, "errors": [{"code": "schema", "message": "root must be an object"}], "warnings": []}
    collections = {}
    ids = set()
    for name in ("nodes", "edges", "labels", "containers"):
        items = data.get(name, [])
        if not isinstance(items, list):
            issue("schema", [name], "collection must be an array")
            items = []
        collections[name] = []
        for item in items:
            if not isinstance(item, dict) or not isinstance(item.get("id"), str) or not item["id"]:
                issue("schema", [name], "every object needs a nonempty string id")
                continue
            if item["id"] in ids:
                issue("duplicate-id", [item["id"]], "IDs must be globally unique")
                continue
            ids.add(item["id"])
            if name != "edges" and (not all(finite(item.get(key)) for key in ("x", "y", "width", "height"))
                                    or item["width"] <= 0 or item["height"] <= 0):
                issue("invalid-bounds", [item["id"]], "bounds must be finite with positive dimensions")
                continue
            collections[name].append(item)

    nodes = {item["id"]: item for item in collections["nodes"]}
    edges = {item["id"]: item for item in collections["edges"]}
    labels = collections["labels"]
    for a, b in combinations(nodes.values(), 2):
        if rect_overlap(a, b):
            issue("node-overlap", [a["id"], b["id"]], "business node bounds overlap")

    segments = {}
    bends = {}
    for eid, edge in edges.items():
        valid = True
        for endpoint in ("from", "to"):
            ref = edge.get(endpoint)
            if not isinstance(ref, str) or ref not in nodes:
                issue("unknown-node", [eid], f"unknown {endpoint} node")
                valid = False
        points = edge.get("points")
        if (not isinstance(points, list) or len(points) < 2
                or any(not isinstance(p, list) or len(p) != 2 or not all(finite(v) for v in p) for p in points)):
            issue("invalid-points", [eid], "need at least two finite [x,y] points")
            continue
        for endpoint, point in (("from", points[0]), ("to", points[-1])):
            port = edge.get(endpoint + "_port")
            if not isinstance(port, str) or port not in PORTS:
                issue("invalid-port", [eid], f"{endpoint}_port must be left/right/top/bottom")
                valid = False
            elif isinstance(edge.get(endpoint), str) and edge[endpoint] in nodes:
                node = nodes[edge[endpoint]]
                ratio = PORTS[port]
                expected = (node["x"] + node["width"] * ratio[0], node["y"] + node["height"] * ratio[1])
                if not same(point, expected):
                    issue("port-mismatch", [eid, node["id"]], f"{endpoint} point is not at the named port")
        current = list(zip(points, points[1:]))
        for a, b in current:
            if same(a, b):
                issue("zero-segment", [eid], "consecutive points must differ")
                valid = False
            elif abs(a[0] - b[0]) > EPS and abs(a[1] - b[1]) > EPS:
                issue("non-orthogonal", [eid], "connector segment is diagonal")
                valid = False
        if not valid:
            continue
        segments[eid] = current
        bends[eid] = sum(axis(a) != axis(b) for a, b in zip(current, current[1:]))
        for node in nodes.values():
            if any(hits_rect(segment, node) for segment in current):
                issue("edge-through-node", [eid, node["id"]], "connector enters node interior")
        for i, a in enumerate(current):
            for j, b in enumerate(current[i + 1:], i + 1):
                if collinear_overlap(a, b):
                    issue("self-overlap", [eid], "connector retraces a segment")
                elif j > i + 1 and intersection(a, b) is not None:
                    issue("self-crossing", [eid], "connector crosses itself", warning=True)

    for label in labels:
        owner = label.get("edge_id")
        if not isinstance(owner, str) or owner not in edges:
            issue("unknown-edge", [label["id"]], "label must identify its owning edge")
        for node in nodes.values():
            if rect_overlap(label, node):
                issue("label-over-node", [label["id"], node["id"]], "edge label overlaps node bounds")
        for eid, path in segments.items():
            if eid != owner and any(hits_rect(segment, label) for segment in path):
                issue("label-over-edge", [label["id"], eid], "label obscures another edge")
    for a, b in combinations(labels, 2):
        if rect_overlap(a, b):
            issue("label-overlap", [a["id"], b["id"]], "edge labels overlap")

    for first, second in combinations(segments, 2):
        edge_a, edge_b = edges[first], edges[second]
        common_origin = edge_a["from"] == edge_b["from"]
        common_destination = edge_a["to"] == edge_b["to"]
        shared_ports = []
        for end_a, index_a in (("from", 0), ("to", -1)):
            for end_b, index_b in (("from", 0), ("to", -1)):
                if edge_a[end_a] == edge_b[end_b] and same(edge_a["points"][index_a], edge_b["points"][index_b]):
                    shared_ports.append(edge_a["points"][index_a])
        for a in segments[first]:
            for b in segments[second]:
                if collinear_overlap(a, b):
                    dim = axis(a)
                    same_direction = (a[1][dim] - a[0][dim]) * (b[1][dim] - b[0][dim]) > 0
                    if not (same_direction and (common_origin or common_destination)):
                        issue("false-merge", [first, second], "unrelated or opposing edges share a segment")
                else:
                    point = intersection(a, b)
                    if point is not None and not any(same(point, p) for p in shared_ports):
                        # A common trunk can turn or fork at an internal bend.
                        trunk_junction = any(
                            collinear_overlap(sa, sb)
                            and (sa[1][axis(sa)] - sa[0][axis(sa)]) * (sb[1][axis(sb)] - sb[0][axis(sb)]) > 0
                            and any(same(point, p) for p in sa + sb)
                            for sa in segments[first] for sb in segments[second]
                        ) if common_origin or common_destination else False
                        if not trunk_junction:
                            issue("edge-crossing", [first, second], f"crossing at {point}; visually explain", warning=True)

    return {"ok": not errors, "errors": errors, "warnings": warnings,
            "metrics": {"nodes": len(nodes), "edges": len(edges), "labels": len(labels), "bends": bends},
            "scope": "bounding-box geometry only; warnings and semantic correctness require visual review"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("geometry", type=Path)
    args = parser.parse_args()
    try:
        result = check(json.loads(args.geometry.read_text(encoding="utf-8")))
    except (OSError, ValueError) as exc:
        result = {"ok": False, "errors": [{"code": "input", "message": str(exc)}], "warnings": []}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
