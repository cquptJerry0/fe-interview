import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "lint_premium_style.py"
SPEC = importlib.util.spec_from_file_location("lint_premium_style", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PremiumStyleLintTest(unittest.TestCase):
    def test_explicit_grid_dots_satisfy_system_background_without_pattern_or_legend(self):
        circles = "".join(
            f'<circle data-role="grid-dot" cx="{index * 10}" cy="10" r="1"/>'
            for index in range(9)
        )
        rects = "".join(f'<rect x="{index}" y="20" width="1" height="1"/>' for index in range(28))
        texts = "".join(
            [
                '<text data-role="layer-label">输入层</text>',
                '<text data-role="layer-label">执行层</text>',
                '<text data-role="layer-label">回写层</text>',
                '<text data-role="sidebar">Runtime</text>',
            ]
            + [f'<text>节点 {index}</text>' for index in range(4)]
        )
        connectors = "".join('<path d="M 0 0 L 1 1"/>' for _ in range(5))
        svg = f'<svg xmlns="http://www.w3.org/2000/svg">{circles}{rects}{texts}{connectors}</svg>'
        with tempfile.TemporaryDirectory() as directory:
            artifact = Path(directory) / "diagram.svg"
            artifact.write_text(svg, encoding="utf-8")
            metrics = MODULE.collect_svg(artifact)

        self.assertEqual(metrics["patterns"], 0)
        self.assertEqual(metrics["grid_dots"], 9)
        self.assertEqual(metrics["legends"], 0)
        self.assertEqual(MODULE.validate("system-architecture", metrics, set()), [])

    def test_pattern_background_is_rejected_as_parser_incompatible(self):
        metrics = {
            "colors": [],
            "texts_count": 8,
            "rects": 28,
            "patterns": 1,
            "grid_dots": 0,
            "layer_labels": 3,
            "sidebars": 1,
            "legends": 0,
            "connectors": 5,
        }
        self.assertIn(
            "uses unsupported <pattern>",
            MODULE.validate("system-architecture", metrics, set()),
        )


if __name__ == "__main__":
    unittest.main()
