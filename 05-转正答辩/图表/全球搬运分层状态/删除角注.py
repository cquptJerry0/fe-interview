import json, subprocess, copy
from pathlib import Path
from PIL import Image, ImageChops
R=Path('/Users/bytedance/Projects/personal/面试/05-转正答辩/图表/全球搬运分层状态')
TOKEN='RvEswCkAwhQJBLbNiPdcHpcHntd'
before=json.loads((R/'删除角注前备份.json').read_text(encoding='utf-8'))
texts={
'横向：任务推进阶段    纵向：独立记录对象',
'结束后回查：流程仍为结束；只更新未结束素材的执行结果。  实线：迁移    虚线：重查 / 异常收尾'
}
removed=[n for n in before['nodes'] if n.get('text',{}).get('text') in texts]
assert len(removed)==2 and {n['text']['text'] for n in removed}==texts
candidate=copy.deepcopy(before)
candidate['nodes']=[n for n in candidate['nodes'] if n not in removed]
ids={n['id'] for n in candidate['nodes']}
for n in candidate['nodes']:
 if n['type']=='connector':
  for e in ('start','end'):assert n['connector'][e]['attached_object']['id'] in ids
(R/'删除角注-原生节点.json').write_text(json.dumps(candidate,ensure_ascii=False,indent=2),encoding='utf-8')
def call(args):
 p=subprocess.run(['lark-cli',*args,'--as','user'],cwd=R,text=True,capture_output=True,timeout=120)
 d=json.loads(p.stdout)
 assert p.returncode==0 and d.get('ok'),p.stdout+p.stderr
 return d
args=['whiteboard','+update','--whiteboard-token',TOKEN,'--source','@./删除角注-原生节点.json','--input_format','raw','--overwrite','--idempotent-token','global-transfer-remove-corner-notes-20261018']
dry=call(args+['--dry-run'])
assert dry.get('dry_run')
print('dry_run: only 2 text nodes removed; all other input nodes unchanged',flush=True)
print(json.dumps(call(args),ensure_ascii=False),flush=True)
call(['whiteboard','+export','--whiteboard-token',TOKEN,'--output-type','raw','--output','./删除角注后节点.json'])
after=json.loads((R/'删除角注后节点.json').read_text(encoding='utf-8'))
def normalize(v):
 if isinstance(v,dict):return {k:normalize(x) for k,x in v.items() if k not in ('id','z_index')}
 if isinstance(v,list):return [normalize(x) for x in v]
 if isinstance(v,float):return round(v,4)
 return v
assert len(after['nodes'])==len(before['nodes'])-2
assert sorted(json.dumps(normalize(n),sort_keys=True,ensure_ascii=False) for n in candidate['nodes'])==sorted(json.dumps(normalize(n),sort_keys=True,ensure_ascii=False) for n in after['nodes']), 'Unexpected non-ID change'
assert not any(n.get('text',{}).get('text') in texts for n in after['nodes'])
ids={n['id'] for n in after['nodes']}
for n in after['nodes']:
 if n['type']=='connector':
  for e in ('start','end'):assert n['connector'][e]['attached_object']['id'] in ids
(R/'原生状态图.json').write_text(json.dumps(after,ensure_ascii=False,indent=2),encoding='utf-8')
(R/'线上原生节点.json').write_text(json.dumps(after,ensure_ascii=False,indent=2),encoding='utf-8')
source=json.loads((R/'分层状态图.json').read_text(encoding='utf-8'))
source['nodes']=[n for n in source['nodes'] if n.get('id') not in ('subtitle','footer')]
(R/'分层状态图.json').write_text(json.dumps(source,ensure_ascii=False,indent=2),encoding='utf-8')
result=call(['whiteboard','+export','--whiteboard-token',TOKEN,'--output-type','preview','--output','./删除角注后实际导图'])
p=R/result['data']['preview_image_path']
im=Image.open(p).convert('RGB')
mask=ImageChops.difference(im,Image.new('RGB',im.size,'white')).convert('L').point(lambda p:255 if p>32 else 0)
bb=mask.getbbox();pad=18
bb=(max(0,bb[0]-pad),max(0,bb[1]-pad),min(im.width,bb[2]+pad),min(im.height,bb[3]+pad))
im.crop(bb).save(R/'分层状态图-展示.png')
print(json.dumps({'removed_text_nodes':2,'remaining_nodes':len(after['nodes']),'other_content_and_geometry_unchanged':True,'connector_bindings_valid':True,'display_image':str(R/'分层状态图-展示.png')},ensure_ascii=False),flush=True)
