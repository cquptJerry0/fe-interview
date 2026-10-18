"""转换后的原生节点修正：
1. 连线标签字号统一放大到 22，和图中辅助文字一致；
2. 把转换器拆出来的节点文字合回所属原生形状，节点和文字作为一个整体编辑、居中显示。
   泳道表头（双行不同字号）和圆柱体保留独立文字，避免文字压到圆柱顶部弧线。
"""
import json
import sys
from pathlib import Path

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
CAPTION_SIZE = 22

nodes = json.loads(src.read_text())['nodes']
shapes = [n for n in nodes if n['type'] == 'composite_shape']
texts = [n for n in nodes if n['type'] == 'text_shape']
connectors = [n for n in nodes if n['type'] == 'connector']

def inside(t, s, tol=1):
    return (t['x'] >= s['x'] - tol and t['y'] >= s['y'] - tol and
            t['x'] + t['width'] <= s['x'] + s['width'] + tol and
            t['y'] + t['height'] <= s['y'] + s['height'] + tol)

referenced = set()
for c in connectors:
    for key in ('start_object', 'end_object'):
        obj = c['connector'].get(key) or {}
        if obj.get('id'):
            referenced.add(obj['id'])

removed, merged = set(), 0
for s in shapes:
    kind = (s.get('composite_shape') or {}).get('type')
    if kind == 'cylinder' or (s.get('text') or {}).get('text'):
        continue
    owned = [t for t in texts if inside(t, s) and t['id'] not in removed]
    if len(owned) != 1:
        continue  # 泳道底板、表头等包含多段文字的容器保持原样
    t = owned[0]
    if t['id'] in referenced:
        continue
    text = dict(t['text'])
    text['horizontal_align'] = 'center'
    text['vertical_align'] = 'mid'
    s['text'] = text
    removed.add(t['id'])
    merged += 1

for c in connectors:
    for cap in (c['connector'].get('captions') or {}).get('data', []):
        cap['font_size'] = CAPTION_SIZE

result = [n for n in nodes if n['id'] not in removed]
for i, n in enumerate(result, 1):
    n['z_index'] = i

assert not (removed & referenced), '连线不能引用被合并的文字'
dst.write_text(json.dumps({'nodes': result}, ensure_ascii=False, indent=2))
print(json.dumps({
    'input_nodes': len(nodes), 'output_nodes': len(result), 'merged_text_into_shape': merged,
    'connectors': len(connectors),
    'captions_resized': sum(len((c['connector'].get('captions') or {}).get('data', [])) for c in connectors),
}, ensure_ascii=False))
