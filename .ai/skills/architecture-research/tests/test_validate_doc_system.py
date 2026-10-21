#!/usr/bin/env python3
"""Regression tests for validate_doc_system.py."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "validate_doc_system.py"


class ValidateDocSystemTest(unittest.TestCase):
    def run_validator(
        self,
        files: dict[str, str],
        *extra_args: str,
    ) -> tuple[subprocess.CompletedProcess[str], dict[str, object]]:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            for relative, content in files.items():
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    str(root),
                    "--entry",
                    "README.md",
                    "--json",
                    *extra_args,
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            return result, json.loads(result.stdout)

    def test_detects_structural_and_readability_issues(self) -> None:
        repeated = (
            "这是一段故意在多个文档中完整重复的长正文，用于确认校验器能够发现"
            "跨文档复制定义，而不是只检查标题和链接。"
        )
        files = {
            "README.md": f"""\
# 入口

[断开的链接](missing.md)
[已连接文档](docs/linked.md)
[重复正文文档](docs/duplicate.md)

## 正常层级

#### 跳级标题

| 第一列 | 第二列 |
|---|---|
| 只有一列 |

- Memory Consolidation Skill Discovery Harness Adaptation

这里包含绝密模式。
""",
            "docs/linked.md": f"""\
# 已连接文档

## 重复标题

## 重复标题

{repeated}
""",
            "docs/duplicate.md": f"""\
# 重复正文文档

{repeated}
""",
            "docs/orphan.md": "# 孤立文档\n",
        }

        result, payload = self.run_validator(
            files,
            "--forbid-pattern",
            "绝密模式",
        )
        codes = {finding["code"] for finding in payload["findings"]}

        self.assertEqual(result.returncode, 1)
        self.assertTrue(
            {
                "broken-local-link",
                "heading-level-jump",
                "table-column-mismatch",
                "duplicate-heading",
                "orphan-document",
                "repeated-paragraph",
                "dense-english-terms",
                "forbidden-pattern",
            }.issubset(codes)
        )

    def test_accepts_clean_document_system_without_false_positives(self) -> None:
        files = {
            "README.md": """\
# 入口

[阅读指南](docs/guide.md)

````markdown
## 模板中的标题

```text
[模板里的断链](missing.md)
```
````
""",
            "docs/guide.md": """\
# 阅读指南

## 第一部分

### 章节目标

Harness(智能体运行支撑环境)负责组织上下文、工具和验证过程。
Context(本轮模型看到的信息)和 Workflow(固定执行流程)也在这里首次解释。
后续可以直接组合使用 Harness、Context 和 Workflow，不应再次产生术语提醒。

| 项目 | 说明 |
|---|---|
| 主干 | 唯一知识定义 |

## 第二部分

### 章节目标

这一部分解释验证方式，不重复第一部分的定义。
""",
        }

        result, payload = self.run_validator(files)

        self.assertEqual(result.returncode, 0)
        self.assertEqual(payload["errors"], 0)
        self.assertEqual(payload["warnings"], 0)


if __name__ == "__main__":
    unittest.main()
