import concurrent.futures,json,subprocess,sys,time
from pathlib import Path
from PIL import Image
R=Path(__file__).parent
names={'06':'归属确认','07':'引用替换'}

def build(num):
    src=R/f'{num}-{names[num]}.mmd'
    rawfile=R/f'{num}-时序转换.json'
    p=subprocess.run(['npx','-y','@larksuite/whiteboard-cli@^0.2.13','-i',str(src),'--to','openapi','-o',str(rawfile)],capture_output=True,text=True,timeout=180)
    p.check_returncode()
    data=json.loads(p.stdout)
    assert data['code']==0,data.get('error')
    raw=json.loads(rawfile.read_text())
    for n in raw['nodes']:
        n['x']=n.get('x',0)+80
        if n['type']=='life_line':
            label=n['text']['text'];center=n['x']+n['width']/2
            db='数据库' in label
            w=330 if db else 310 if ('差异' in label or 'OwnershipService' in label) else 275
            n['width']=max(w,n['width']+28);n['x']=center-n['width']/2;n['height']=112
            n['lifeline']['size']+=75
            if db:n['lifeline']['type']='data_base'
            n['text'].pop('rich_text',None)
            n['style'].update(border_color='#374151',border_color_type=1,fill_color='#DFF5E5' if db else '#F0F4FC',fill_color_type=1)
        else:
            n['y']=n.get('y',0)+75
            if n['type']=='connector':
                for side in ('start','end'):
                    p=n['connector'][side].get('position')
                    if p:p['x']+=80;p['y']+=75
                n['style'].update(border_color='#374151',border_color_type=1)
                for caption in n['connector'].get('captions',{}).get('data',[]):caption.pop('rich_text',None)
            elif n['type']=='combined_fragment':
                n['table']['meta']['style'].update(border_color='#374151',border_color_type=1,fill_color='#FFFFFF',fill_color_type=1)
            elif n['type']=='composite_shape':
                n['style'].update(border_color='#374151',border_color_type=1,fill_color='#FEF1CE',fill_color_type=1)
    if num=='07':
        # 扩展泳道间距而不放大头部，防止数据库／计算／发布头部相贴。
        sx=lambda x:80+(x-80)*1.35
        for n in raw['nodes']:
            if n['type']=='life_line':
                center=sx(n['x']+n['width']/2);n['x']=center-n['width']/2
            else:
                n['x']=sx(n['x']);n['width']*=1.35
                if n['type']=='combined_fragment':
                    n['table']['meta']['col_sizes']=[w*1.35 for w in n['table']['meta']['col_sizes']]
                elif n['type']=='connector':
                    for side in ('start','end'):
                        p=n['connector'][side].get('position')
                        if p:p['x']=sx(p['x'])
                    for p in n['connector'].get('turning_points',[]):p['x']*=1.35
                    for c in n['connector'].get('captions',{}).get('data',[]):
                        if c['text'].startswith('reconcilePublication()'):
                            c['text']='reconcilePublication()\n先读取正式版\n海外启用审批时补查 Pre 与审批'
                        elif c['text'].startswith('判定发布结果'):
                            c['text']='判定发布结果\nSUCCESS / PENDING_APPROVAL\n未确认则保留 UNKNOWN'
        heads=sorted((n for n in raw['nodes'] if n['type']=='life_line'),key=lambda n:n['x'])
        assert all(b['x']-a['x']-a['width']>=30 for a,b in zip(heads,heads[1:]))
    ids=[n['id'] for n in raw['nodes']]
    assert len(ids)==len(set(ids))
    assert sum(n['type']=='life_line' for n in raw['nodes'])=={'06':3,'07':5}[num]
    assert not any(n['type'] in ('svg','image') for n in raw['nodes'])
    (R/f'{num}-时序原生.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2),encoding='utf-8')
    # 自动渲染仅用于本地初检；最终验收来自修正后的飞书导图。
    p=subprocess.run(['npx','-y','@larksuite/whiteboard-cli@^0.2.13','-i',str(src),'-o',str(R/f'{num}-时序本地.png'),'--scale','1'],capture_output=True,text=True,timeout=180)
    p.check_returncode();assert json.loads(p.stdout)['code']==0
    im=Image.open(R/f'{num}-时序本地.png');im.thumbnail((2000,3900));im.save(R/f'{num}-时序本地审阅.png')
    print(num,'转换与本地渲染成功',len(raw['nodes']),'节点',flush=True)

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    list(pool.map(build,sys.argv[1:] or names))
