#!/usr/bin/env python3
"""Validate a Markdown document system for structural and readability issues."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict, deque
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import unquote


MARKDOWN_LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
TABLE_SEPARATOR_RE = re.compile(r"^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$")
ENGLISH_WORD_RE = re.compile(r"\b[A-Za-z][A-Za-z0-9.+_-]*\b")
EXPLANATION_TERM_RE = re.compile(
    r"((?:[A-Za-z][A-Za-z0-9.+_-]*)(?:\s+[A-Za-z][A-Za-z0-9.+_-]*)*)"
    r"\([^)]*[\u4e00-\u9fff][^)]*\)"
)
HTML_COMMENT_RE = re.compile(r"<!--.*?-->")
FENCE_RE = re.compile(r"^\s*(`{3,}|~{3,})")
INLINE_CODE_RE = re.compile(r"`[^`]*`")
RAW_URL_RE = re.compile(r"https?://\S+")
LINK_ONLY_LINE_RE = re.compile(r"^\s*(?:[-*]\s+)?\[[^\]]+\]\([^)]+\)\s*$")

COMMON_TERMS = {
    "Agent",
    "Agents",
    "API",
    "APIs",
    "RAG",
    "MCP",
    "HTTP",
    "HTTPS",
    "CLI",
    "SDK",
    "SQL",
    "UI",
    "UX",
    "JSON",
    "YAML",
    "Git",
    "GitHub",
    "README",
    "URL",
    "URLs",
    "Web",
    "AI",
    "LLM",
    "LLMs",
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
}


@dataclass
class Finding:
    severity: str
    code: str
    file: str
    line: int
    message: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate links, headings, tables, reachability, repetition, and prose readability."
    )
    parser.add_argument("root", type=Path, help="Document root directory")
    parser.add_argument(
        "--entry",
        default="README.md",
        help="Entry Markdown path relative to root (default: README.md)",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Relative path prefix to exclude; repeat as needed",
    )
    parser.add_argument(
        "--forbid-pattern",
        action="append",
        default=[],
        help="Regex that must not appear in prose; repeat as needed",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Return non-zero when warnings are present",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON")
    return parser.parse_args()


def is_excluded(path: Path, root: Path, prefixes: list[str]) -> bool:
    relative = path.relative_to(root).as_posix()
    return any(relative == prefix or relative.startswith(prefix.rstrip("/") + "/") for prefix in prefixes)


def markdown_files(root: Path, excludes: list[str]) -> list[Path]:
    files = []
    for path in root.rglob("*.md"):
        if any(part.startswith(".") and part not in {".", ".."} for part in path.relative_to(root).parts):
            continue
        if not is_excluded(path, root, excludes):
            files.append(path)
    return sorted(files)


def strip_code_and_comments(lines: list[str]) -> list[tuple[int, str]]:
    result: list[tuple[int, str]] = []
    in_fence = False
    fence_char = ""
    fence_length = 0
    start_index = 0
    if lines and lines[0].strip() == "---":
        for index, line in enumerate(lines[1:], start=1):
            if line.strip() == "---":
                start_index = index + 1
                break

    for line_no, raw in enumerate(lines[start_index:], start=start_index + 1):
        fence_match = FENCE_RE.match(raw)
        if fence_match:
            marker = fence_match.group(1)
            if not in_fence:
                in_fence = True
                fence_char = marker[0]
                fence_length = len(marker)
            elif marker[0] == fence_char and len(marker) >= fence_length:
                in_fence = False
                fence_char = ""
                fence_length = 0
            continue
        if in_fence:
            continue
        line = HTML_COMMENT_RE.sub("", raw)
        result.append((line_no, line))
    return result


def resolve_local_link(source: Path, target: str, root: Path) -> Path | None:
    target = target.strip()
    if not target or target.startswith(("#", "http://", "https://", "mailto:", "tel:")):
        return None
    clean_target = unquote(target.split("#", 1)[0].split("?", 1)[0])
    if not clean_target:
        return None
    candidate = Path(clean_target)
    if candidate.is_absolute():
        return candidate
    return (source.parent / candidate).resolve()


def count_table_columns(line: str) -> int:
    stripped = line.strip()
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|"):
        stripped = stripped[:-1]
    return len(re.split(r"(?<!\\)\|", stripped))


def normalize_heading(text: str) -> str:
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\s+", " ", text.strip())
    return text.casefold()


def normalize_paragraph(lines: list[str]) -> str:
    text = " ".join(line.strip() for line in lines)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\s+", "", text)
    return text


def readability_text(line: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
    text = INLINE_CODE_RE.sub("", text)
    text = RAW_URL_RE.sub("", text)
    return text


def extract_paragraphs(prose_lines: list[tuple[int, str]]) -> list[tuple[int, str]]:
    paragraphs: list[tuple[int, str]] = []
    buffer: list[str] = []
    start_line = 0

    def flush() -> None:
        nonlocal buffer, start_line
        if buffer:
            normalized = normalize_paragraph(buffer)
            if len(normalized) >= 40:
                paragraphs.append((start_line, normalized))
        buffer = []
        start_line = 0

    for line_no, line in prose_lines:
        stripped = line.strip()
        if (
            not stripped
            or stripped.startswith(("#", "|", "-", "*", ">", "<"))
            or re.match(r"^\d+\.\s+", stripped)
        ):
            flush()
            continue
        if not buffer:
            start_line = line_no
        buffer.append(stripped)
    flush()
    return paragraphs


def validate_file(
    path: Path,
    root: Path,
    forbid_patterns: list[re.Pattern[str]],
) -> tuple[list[Finding], set[Path], list[tuple[int, str]]]:
    findings: list[Finding] = []
    links: set[Path] = set()
    lines = path.read_text(encoding="utf-8").splitlines()
    prose_lines = strip_code_and_comments(lines)
    relative = path.relative_to(root).as_posix()

    headings: dict[tuple[str, ...], int] = {}
    heading_stack: list[str] = []
    previous_level = 0
    in_table = False
    expected_columns = 0
    seen_uncommon_terms: set[str] = set()

    for line_no, line in prose_lines:
        stripped = line.strip()
        heading_match = HEADING_RE.match(stripped)
        if heading_match:
            level = len(heading_match.group(1))
            title = normalize_heading(heading_match.group(2))
            if previous_level and level > previous_level + 1:
                findings.append(
                    Finding(
                        "error",
                        "heading-level-jump",
                        relative,
                        line_no,
                        f"标题从 H{previous_level} 跳到 H{level}",
                    )
                )
            previous_level = level
            heading_stack = heading_stack[: level - 1]
            heading_path = tuple([*heading_stack, title])
            if heading_path in headings:
                findings.append(
                    Finding(
                        "warning",
                        "duplicate-heading",
                        relative,
                        line_no,
                        f"同一章节路径下的标题与第 {headings[heading_path]} 行重复："
                        f"{heading_match.group(2)}",
                    )
                )
            else:
                headings[heading_path] = line_no
            heading_stack.append(title)

        if stripped.startswith("|"):
            columns = count_table_columns(stripped)
            if not in_table:
                in_table = True
                expected_columns = columns
            elif not TABLE_SEPARATOR_RE.match(stripped) and columns != expected_columns:
                findings.append(
                    Finding(
                        "error",
                        "table-column-mismatch",
                        relative,
                        line_no,
                        f"表格列数应为 {expected_columns}，实际为 {columns}",
                    )
                )
        else:
            in_table = False
            expected_columns = 0

        for target in MARKDOWN_LINK_RE.findall(line):
            resolved = resolve_local_link(path, target, root)
            if resolved is None:
                continue
            if not resolved.exists():
                findings.append(
                    Finding(
                        "error",
                        "broken-local-link",
                        relative,
                        line_no,
                        f"本地链接不存在：{target}",
                    )
                )
            elif resolved.suffix.lower() == ".md":
                links.add(resolved)

        for pattern in forbid_patterns:
            if pattern.search(line):
                findings.append(
                    Finding(
                        "error",
                        "forbidden-pattern",
                        relative,
                        line_no,
                        f"命中禁用模式：{pattern.pattern}",
                    )
                )

        if (
            not stripped
            or stripped.startswith(("#", "|", ">", "<"))
            or LINK_ONLY_LINE_RE.match(stripped)
        ):
            continue

        readable = readability_text(stripped)
        english_words = ENGLISH_WORD_RE.findall(readable)
        uncommon_words = [word for word in english_words if word not in COMMON_TERMS]
        difficult_words = [
            word
            for word in uncommon_words
            if len(word) >= 4
            and not word.islower()
            and not re.fullmatch(r"[A-Fa-f0-9]+", word)
        ]
        explained_terms = {
            word.casefold()
            for phrase in EXPLANATION_TERM_RE.findall(readable)
            for word in ENGLISH_WORD_RE.findall(phrase)
        }
        new_unexplained_uncommon = {
            word.casefold()
            for word in uncommon_words
            if word.casefold() not in seen_uncommon_terms
            and word.casefold() not in explained_terms
        }
        new_unexplained_difficult = {
            word.casefold()
            for word in difficult_words
            if word.casefold() in new_unexplained_uncommon
        }
        chinese_chars = len(re.findall(r"[\u4e00-\u9fff]", readable))
        latin_chars = len(re.findall(r"[A-Za-z]", readable))

        if len(new_unexplained_difficult) >= 3:
            findings.append(
                Finding(
                    "warning",
                    "dense-english-terms",
                    relative,
                    line_no,
                    "同一行包含多个较难英文术语，建议拆句或增加通俗注释",
                )
            )
        elif (
            len(new_unexplained_uncommon) >= 5
            and latin_chars >= 24
            and latin_chars > chinese_chars * 2
        ):
            findings.append(
                Finding(
                    "warning",
                    "english-heavy-prose",
                    relative,
                    line_no,
                    "正文英文密度较高，确认是否可以用中文解释",
                )
            )
        seen_uncommon_terms.update(word.casefold() for word in uncommon_words)
        if re.match(r"^[-*]\s+", stripped) and len(stripped) > 180:
            findings.append(
                Finding(
                    "warning",
                    "long-bullet",
                    relative,
                    line_no,
                    "分点超过 180 个字符，建议拆分为判断、机制和边界",
                )
            )

    return findings, links, extract_paragraphs(prose_lines)


def reachable_markdown(entry: Path, graph: dict[Path, set[Path]]) -> set[Path]:
    visited: set[Path] = set()
    queue: deque[Path] = deque([entry])
    while queue:
        current = queue.popleft()
        if current in visited:
            continue
        visited.add(current)
        for neighbor in graph.get(current, set()):
            if neighbor not in visited:
                queue.append(neighbor)
    return visited


def main() -> int:
    args = parse_args()
    root = args.root.expanduser().resolve()
    if not root.is_dir():
        print(f"文档根目录不存在：{root}", file=sys.stderr)
        return 2

    files = markdown_files(root, args.exclude)
    if not files:
        print(f"没有找到 Markdown 文件：{root}", file=sys.stderr)
        return 2

    entry = (root / args.entry).resolve()
    if not entry.exists():
        print(f"入口文档不存在：{entry}", file=sys.stderr)
        return 2

    forbid_patterns = [re.compile(pattern) for pattern in args.forbid_pattern]
    findings: list[Finding] = []
    graph: dict[Path, set[Path]] = {}
    paragraph_locations: dict[str, list[tuple[str, int]]] = defaultdict(list)

    for path in files:
        file_findings, links, paragraphs = validate_file(path, root, forbid_patterns)
        findings.extend(file_findings)
        graph[path.resolve()] = {link.resolve() for link in links if root in link.resolve().parents}
        relative = path.relative_to(root).as_posix()
        for line_no, paragraph in paragraphs:
            paragraph_locations[paragraph].append((relative, line_no))

    reachable = reachable_markdown(entry, graph)
    for path in files:
        if path.resolve() not in reachable:
            findings.append(
                Finding(
                    "warning",
                    "orphan-document",
                    path.relative_to(root).as_posix(),
                    1,
                    f"文档无法从入口 {args.entry} 到达",
                )
            )

    for paragraph, locations in paragraph_locations.items():
        unique_files = {file for file, _ in locations}
        if len(unique_files) < 2:
            continue
        first_file, first_line = locations[0]
        preview = paragraph[:60] + ("..." if len(paragraph) > 60 else "")
        findings.append(
            Finding(
                "warning",
                "repeated-paragraph",
                first_file,
                first_line,
                f"相同长段落出现在多个文档：{', '.join(sorted(unique_files))}；内容：{preview}",
            )
        )

    severity_order = {"error": 0, "warning": 1}
    findings.sort(key=lambda item: (severity_order[item.severity], item.file, item.line, item.code))
    counts = Counter(finding.severity for finding in findings)

    if args.json:
        payload = {
            "root": str(root),
            "entry": args.entry,
            "files": len(files),
            "errors": counts["error"],
            "warnings": counts["warning"],
            "findings": [asdict(finding) for finding in findings],
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for finding in findings:
            print(
                f"[{finding.severity.upper()}] "
                f"{finding.file}:{finding.line} "
                f"{finding.code} - {finding.message}"
            )
        print(
            f"\n检查完成：{len(files)} 个 Markdown 文件，"
            f"{counts['error']} 个错误，{counts['warning']} 个提醒。"
        )

    if counts["error"]:
        return 1
    if args.strict and counts["warning"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
