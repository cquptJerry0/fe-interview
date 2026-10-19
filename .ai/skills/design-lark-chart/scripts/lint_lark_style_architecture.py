#!/usr/bin/env python3
"""Check palette and references without prescribing architecture complexity."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any, Iterable

HERE = Path(__file__).resolve()
SKILL_ROOT = HERE.parent.parent
DEFAULT_TOKENS = SKILL_ROOT / "assets" / "style-tokens" / "lark-style-architecture.json"


def walk(nodes: Iterable[dict[str, Any]], depth: int = 1) -> Iterable[tuple[dict[str, Any], int]]:
    for node in nodes:
        yield node, depth
        children = node.get("children") or []
        if isinstance(children, list):
            yield from walk(children, depth + 1)


def token_colors(tokens: dict[str, Any]) -> set[str]:
    style = tokens.get("style") or {}
    colors: set[str] = set()
    for section in ("fill_colors", "border_colors", "text_colors"):
        for item in ((style.get("palette") or {}).get(section) or []):
            value = item.get("value")
            if isinstance(value, str):
                colors.add(value.lower())
    return colors


def color_values(node: dict[str, Any]) -> Iterable[str]:
    for key in ("fillColor", "borderColor", "textColor"):
        value = node.get(key)
        if isinstance(value, str):
            yield value
    connector = node.get("connector") or {}
    value = connector.get("lineColor")
    if isinstance(value, str):
        yield value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("board", type=Path)
    parser.add_argument("--tokens", type=Path, default=DEFAULT_TOKENS)
    args = parser.parse_args()

    board = json.loads(args.board.read_text())
    tokens = json.loads(args.tokens.read_text())
    allowed_colors = token_colors(tokens)
    nodes = list(walk(board.get("nodes") or []))

    frames = [node for node, _ in nodes if node.get("type") == "frame"]
    rects = [node for node, _ in nodes if node.get("type") == "rect"]
    connectors = [node for node, _ in nodes if node.get("type") == "connector"]
    max_depth = max((depth for _, depth in nodes), default=0)

    used_colors = {color.lower() for node, _ in nodes for color in color_values(node)}
    unknown_colors = sorted(used_colors - allowed_colors)
    nonwhite_fills = {
        node.get("fillColor", "").lower()
        for node in frames + rects
        if isinstance(node.get("fillColor"), str) and node.get("fillColor", "").lower() != "#ffffff"
    }

    right_angle = 0
    arrow_end = 0
    for connector_node in connectors:
        connector = connector_node.get("connector") or {}
        if connector.get("lineShape") == "rightAngle":
            right_angle += 1
        if connector.get("endArrow") == "arrow":
            arrow_end += 1

    failures: list[str] = []
    if unknown_colors:
        failures.append("uses colors outside lark-style-architecture style tokens")
    ids = [node["id"] for node, _ in nodes if "id" in node]
    known_ids = {value for value in ids if isinstance(value, str) and value}
    if len(known_ids) != len(ids):
        failures.append("explicit node IDs must be nonempty and unique")
    for node in connectors:
        connector = node.get("connector") or {}
        for endpoint in ("from", "to"):
            value = connector.get(endpoint)
            coordinate = isinstance(value, dict) and all(
                isinstance(value.get(axis), (int, float))
                and not isinstance(value.get(axis), bool)
                and math.isfinite(value[axis]) for axis in ("x", "y")
            )
            if not coordinate and not (isinstance(value, str) and value in known_ids):
                failures.append(f"connector {node.get('id')} has unknown {endpoint}")

    report = {
        "ok": not failures,
        "metrics": {
            "frames": len(frames),
            "rects": len(rects),
            "connectors": len(connectors),
            "max_depth": max_depth,
            "nonwhite_fills": sorted(nonwhite_fills),
            "unknown_colors": unknown_colors,
            "right_angle_connectors": right_angle,
            "arrow_end_connectors": arrow_end,
        },
        "failures": failures,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
