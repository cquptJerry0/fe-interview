#!/usr/bin/env python3
"""Report review candidates, not banned words or semantic pass/fail."""
import argparse
import json
from pathlib import Path
import re

PATTERNS = {
    'process_or_rejected_option': r'本次(?:修改|更新|将)|(?:不再|取消|不采用|不走)|已(?:清理|删除|移除)|无残留',
    'abstract_claim': r'(?:赋能|形成闭环|全面提升|提升.{0,8}(?:能力|稳定性)|构建完整机制)',
    'template_instruction': r'(?:此处填写|提炼prd|让评审人|用.{0,8}句话说明|待补充截图)',
}


def review(text):
    candidates = []
    for number, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        reasons = [name for name, pattern in PATTERNS.items() if re.search(pattern, line, re.I)]
        if line.count('；') + line.count(';') >= 2 and not re.match(r'^\s*[-*]\s', line):
            reasons.append('multiple_parallel_items')
        if reasons:
            candidates.append({'line': number, 'reasons': reasons, 'text': line,
                               'decision': 'review in reader context; keep necessary contract/safety/migration boundaries'})
    return {'candidates': candidates,
            'scope': 'lexical review prompts only; no semantic passed flag',
            'required_manual_checks': ['overall relationships', 'module purpose', 'necessary negatives',
                                       'cause versus parallel list', 'facts and state', 'final packaging']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file')
    args = parser.parse_args()
    print(json.dumps(review(Path(args.file).read_text(encoding='utf-8')), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
