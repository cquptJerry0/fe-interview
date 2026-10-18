import json,subprocess,xml.etree.ElementTree as E,concurrent.futures,uuid
from pathlib import Path
R=Path('/Users/bytedance/Projects/personal/面试/05-转正答辩/图表/全球搬运局部画板')
DOC='https://bytedance.larkoffice.com/wiki/GMEcwktLQip6NhkoYmHcL02Tnqg'
TITLE='Tdt7dbdFGoqbWIxTpnMcCk78n8f'
MARKS={'03':'③','04':'④','05':'⑤','06':'⑥','07':'⑦'}
def run(args,inp=None):
 p=subprocess.run(args,input=inp,text=True,capture_output=True,timeout=180,cwd=str(R))
 if p.returncode:raise RuntimeError(p.stdout+p.stderr)
 try:d=json.loads(p.stdout)
 except ValueError:raise RuntimeError(p.stdout)
 if d.get('ok') is False:raise RuntimeError(p.stdout)
 return d

def fetch():return run(['lark-cli','docs','+fetch','--doc',DOC,'--scope','section','--start-block-id',TITLE,'--detail','full','--as','user'])

baseline=fetch();(R/'五图插入前.json').write_text(json.dumps(baseline,ensure_ascii=False),encoding='utf-8')
mapping={}
for n,mark in MARKS.items():
 cur=fetch();root=E.fromstring(cur['data']['document']['content'])
 matches=[p for p in root.iter('p') if ''.join(p.itertext()).startswith(mark+' ') and '画板待补' in ''.join(p.itertext())]
 assert len(matches)==1,(n,len(matches))
 p=matches[0];parent=next(e for e in root.iter() if p in list(e));index=list(parent).index(p)
 result=run(['lark-cli','docs','+update','--doc',DOC,'--command','block_replace','--block-id',p.get('id'),'--content','<whiteboard type="blank"></whiteboard>','--revision-id',str(cur['data']['document']['revision_id']),'--as','user'])
 assert result.get('data',{}).get('result')=='success' and not result.get('data',{}).get('warnings'),result
 after=fetch();a=E.fromstring(after['data']['document']['content'])
 # Replacement retains cell structure; identify the board at the same local child index.
 table=a.find('table');cells=table.findall('tbody/tr/td');side=0 if n in ('03','04') else 1
 board=list(cells[side])[index]
 assert board.tag=='whiteboard' and board.get('token'),E.tostring(board)
 mapping[n]={'token':board.get('token'),'block_id':board.get('id'),'idempotent':'global-transfer-'+n+'-'+str(uuid.uuid4())}
 (R/'五图位置.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2),encoding='utf-8')
 print('created',n,flush=True)

def publish(n):
 token=mapping[n]['token'];raw=R/(n+'-原生.json')
 export=run(['lark-cli','whiteboard','+export','--whiteboard-token',token,'--output-type','raw','--output',str(R/(n+'-写前备份.json')),'--as','user'])
 dry=run(['lark-cli','whiteboard','+update','--whiteboard-token',token,'--source','@'+str(raw),'--input_format','raw','--overwrite','--dry-run','--as','user'])
 (R/(n+'-预检.json')).write_text(json.dumps(dry,ensure_ascii=False),encoding='utf-8')
 print('dry',n,json.dumps(dry,ensure_ascii=False),flush=True)
 result=run(['lark-cli','whiteboard','+update','--whiteboard-token',token,'--source','@'+str(raw),'--input_format','raw','--idempotent-token',mapping[n]['idempotent'],'--as','user'])
 (R/(n+'-写入回执.json')).write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
 print('written',n,json.dumps(result,ensure_ascii=False),flush=True)
 # Export both raw and real cloud rendering. No business endpoints are called.
 run(['lark-cli','whiteboard','+export','--whiteboard-token',token,'--output-type','raw','--output',str(R/(n+'-线上节点.json')),'--as','user'])
 image=run(['lark-cli','whiteboard','+export','--whiteboard-token',token,'--output-type','preview','--output',str(R/(n+'-飞书导图')),'--as','user'])
 print('exported',n,json.dumps(image,ensure_ascii=False),flush=True)
 return n
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: list(pool.map(publish,MARKS))
final=fetch();(R/'五图插入后.json').write_text(json.dumps(final,ensure_ascii=False),encoding='utf-8')
b=E.fromstring(baseline['data']['document']['content']);f=E.fromstring(final['data']['document']['content'])
assert len(f.findall('table/tbody/tr'))==1
assert len(f.findall('table/tbody/tr/td'))==2
assert len(list(f.iter('whiteboard')))==6
# Non-placeholder text and all existing media are preserved.
def clean_text(root):
 vals=[]
 for e in root.iter():
  if e.tag in ('p','li'):
   t=''.join(e.itertext())
   if '画板待补' not in t:vals.append(t)
 return vals
assert clean_text(b)==clean_text(f)
assert [E.tostring(e) for e in b.iter('img')]==[E.tostring(e) for e in f.iter('img')]
assert E.tostring(b.find('whiteboard'))==E.tostring(f.find('whiteboard'))
print('verified container: five boards, continuous two columns, text/screenshots/overview unchanged',flush=True)
