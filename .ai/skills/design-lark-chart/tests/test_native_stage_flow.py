import json
import subprocess
import tempfile
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CASE = ROOT / 'assets/cases/material-supply-stages'
LIB = ROOT / 'scripts/native_stage_flow.cjs'


def run_check(raw):
    code = "const f=require(process.argv[1]);let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.stringify(f.checkNative(JSON.parse(s))));}catch(e){console.log(JSON.stringify({ok:false,error:e.message}));}});"
    p = subprocess.run(['node', '-e', code, str(LIB)], input=json.dumps(raw), text=True, capture_output=True, check=True)
    return json.loads(p.stdout)


class NativeStageFlowTest(unittest.TestCase):
    def test_new_case_original_and_live_readback(self):
        for name in ('board.openapi.json', 'verified.openapi.json'):
            raw = json.loads((CASE / name).read_text())
            result = run_check(raw)
            self.assertTrue(result['ok'], result)
            self.assertEqual(result['metrics']['sections'], 4)
            self.assertEqual(result['metrics']['connectors'], 32)

    def test_component_types_and_headers(self):
        ns = json.loads((CASE / 'board.openapi.json').read_text())['nodes']
        shapes = [n.get('composite_shape', {}).get('type') for n in ns]
        self.assertEqual(shapes.count('horiz_cylinder'), 3)
        self.assertEqual(shapes.count('cylinder'), 6)
        self.assertIn('note_shape', shapes)
        headers = [n for n in ns if n.get('text', {}).get('text', '').startswith(('VIMO 素材服务', '事件处理 FaaS'))]
        self.assertEqual(len(headers), 4)
        self.assertTrue(all(n['height'] >= 95 and n.get('parent_id') for n in headers))
        title = [n for n in ns if n.get('text', {}).get('text') == '图片文字模板自动供给'][0]
        self.assertEqual(title['type'], 'text_shape')
        self.assertEqual(title['text']['horizontal_align'], 'left')
        self.assertIn('static_preview_time', '\n'.join(n.get('text', {}).get('text', '') for n in ns))

    def test_wrong_same_section_connector_parent_fails(self):
        raw = json.loads((CASE / 'board.openapi.json').read_text())
        connector = next(n for n in raw['nodes'] if n['type'] == 'connector' and n.get('parent_id') and n['connector']['shape'] == 'polyline')
        connector.pop('parent_id')
        result = run_check(raw)
        self.assertFalse(result['ok'])
        self.assertIn('coordinate-space', result['error'])

    def test_unbound_end_fails(self):
        raw = json.loads((CASE / 'board.openapi.json').read_text())
        connector = next(n for n in raw['nodes'] if n['type'] == 'connector')
        connector['connector']['end']['attached_object']['id'] = 'missing'
        self.assertFalse(run_check(raw)['ok'])

    def test_local_coordinate_recovery_and_nonmidpoint(self):
        raw = {'nodes': [
            {'id': 's', 'type': 'section', 'x': 100, 'y': 200, 'width': 600, 'height': 400},
            {'id': 'a', 'type': 'composite_shape', 'parent_id': 's', 'x': 20, 'y': 30, 'width': 100, 'height': 80},
            {'id': 'b', 'type': 'composite_shape', 'parent_id': 's', 'x': 350, 'y': 30, 'width': 100, 'height': 80},
            {'id': 'e', 'type': 'connector', 'parent_id': 's', 'x': 120, 'y': 50, 'width': 230, 'height': 1,
             'connector': {'shape': 'straight', 'start': {'attached_object': {'id': 'a', 'position': {'x': 1, 'y': .25}}}, 'end': {'attached_object': {'id': 'b', 'position': {'x': 0, 'y': .25}}}}},
        ]}
        self.assertTrue(run_check(raw)['ok'])
        raw['nodes'].append({'id': 'blocker', 'type': 'composite_shape', 'x': 300, 'y': 240, 'width': 50, 'height': 50})
        result = run_check(raw)
        self.assertFalse(result['ok'])
        self.assertTrue(any(e['code'] == 'edge-through-node' for e in result['errors']))

    def test_ascii_one_complete_shared_chain(self):
        s = (CASE / 'ascii.md').read_text()
        self.assertEqual(s.count('```text'), 1)
        block = re.search(r'```text\n(.*?)\n```', s, re.S).group(1)
        self.assertEqual(block.count('distribute_record'), 1)
        for value in ('static_review_status', 'static_preview_time', 'category_auto_sync_config', 'client_scene_content_draft', 'client_scene_content', 'autoDistributeTask', 'publishTask'):
            self.assertIn(value, block)
        self.assertGreaterEqual(block.count('▶') + block.count('▼') + block.count('▲'), 20)

    def test_build_reproduces_final_design_without_remote_actions(self):
        with tempfile.TemporaryDirectory() as d:
            subprocess.run(['node', str(CASE / 'build.cjs'), d], check=True, capture_output=True)
            for name in ('board.json', 'design.json'):
                self.assertEqual(json.loads((Path(d) / name).read_text()), json.loads((CASE / name).read_text()))
        for name in ('build.cjs', 'finalize.cjs'):
            source = (CASE / name).read_text()
            self.assertNotIn('lark-cli', source)
            self.assertNotIn('whiteboard-token', source)

    def test_entrypoint_has_enforced_case_and_ascii_routes(self):
        s = (ROOT / 'SKILL.md').read_text()
        for value in ('必须匹配并读取好案例', '完整 ASCII', 'horiz_cylinder', 'section.title', '不能宣布成图完成', '生成/检查默认不写远端'):
            self.assertIn(value, s)
        for name in ('ascii.md', 'build.cjs', 'finalize.cjs', 'preview.jpg'):
            self.assertTrue((CASE / name).exists())


if __name__ == '__main__':
    unittest.main()
