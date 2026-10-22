#!/usr/bin/env python3
"""Validate Skill structure and references; never claim semantic writing quality."""
import argparse
import json
from pathlib import Path
import re

CORE = ['整体逻辑.md', '语言与最终状态.md', '格式与信息组织.md', '事实与表达边界.md']
WORKFLOW = ['目标与材料.md', '主线与大纲.md', '正文生成.md', '验收与纠偏.md']
INTERNAL = re.compile(r'https?://[^\s)<>]*\b(?:larkoffice\.com|bytedance\.(?:net|com)|tiktok-row\.net)|codex://threads/|ou_[0-9a-f]{20,}|/Users/[^\s`]+')
LINK = re.compile(r'\[[^\]]+\]\(([^)]+)\)')


def validate(root, allow_private_sources=False):
    root = Path(root).resolve()
    errors = []
    checks = []
    entry = root / 'SKILL.md'
    if not entry.is_file():
        return {'passed': False, 'errors': ['SKILL.md missing'], 'checks': []}
    text = entry.read_text(encoding='utf-8')
    front = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    if front is None:
        errors.append('YAML frontmatter missing')
    else:
        keys = re.findall(r'^([a-z_]+):', front.group(1), re.M)
        if sorted(keys) != ['description', 'name'] or not re.search(r'^name: writing-collab$', front.group(1), re.M):
            errors.append('frontmatter must contain name=writing-collab and description')
    if len(text.splitlines()) >= 500:
        errors.append('entry exceeds progressive-loading budget')
    for folder, names in [('核心规则', CORE), ('写作流程', WORKFLOW)]:
        for name in names:
            rel = f'references/{folder}/{name}'
            if not (root / rel).is_file() or rel not in text:
                errors.append(f'entry reference missing: {rel}')
    checks.append('required rules and workflow linked from entry')
    for path in sorted(root.rglob('*')):
        if path.is_symlink():
            errors.append(f'symlink in portable Skill: {path.relative_to(root)}')
            continue
        if not path.is_file() or path.suffix not in {'.md', '.yaml'}:
            continue
        content = path.read_text(encoding='utf-8')
        rel = str(path.relative_to(root))
        private_case = allow_private_sources and rel.startswith('references/样本/原案例/')
        if INTERNAL.search(content) and not private_case:
            errors.append(f'private source or identifier in portable content: {rel}')
        if not content.strip():
            errors.append(f'empty file: {rel}')
        if any(line.rstrip() != line for line in content.splitlines()):
            errors.append(f'trailing whitespace: {rel}')
        for target in LINK.findall(content):
            if target.startswith(('https://', 'http://', '#', 'mailto:')):
                continue
            if private_case and target.startswith('codex://threads/'):
                continue
            resolved = (path.parent / target.split('#')[0]).resolve()
            if not resolved.is_relative_to(root):
                errors.append(f'external relative dependency: {rel} -> {target}')
            elif not resolved.is_file():
                errors.append(f'broken reference: {rel} -> {target}')
    checks += ['relative links resolve within Skill',
               'private sources allowed only in original-case directory' if allow_private_sources
               else 'portable content has no private source identifiers']
    return {'passed': not errors, 'errors': errors, 'checks': checks,
            'scope': 'structure, loading routes, references, portability; not prose quality'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', nargs='?', default='.')
    parser.add_argument('--allow-private-sources', action='store_true',
                        help='local original cases only; never use for public repository checks')
    args = parser.parse_args()
    result = validate(args.root, allow_private_sources=args.allow_private_sources)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
