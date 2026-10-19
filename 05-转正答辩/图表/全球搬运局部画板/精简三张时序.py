import concurrent.futures,json,subprocess,time,sys
from pathlib import Path
from PIL import Image
R=Path(__file__).parent
NAMES={'03':'执行恢复','06':'归属确认','07':'引用替换'}

def compact(num):
    src=R/f'{num}-{NAMES[num]}.mmd'
    outfile=R/f'{num}-精简转换.json'
    p=subprocess.run(['npx','-y','@larksuite/whiteboard-cli@^0.2.13','-i',str(src),'--to','openapi','-o',str(outfile)],capture_output=True,text=True,timeout=180)
    p.check_returncode();result=json.loads(p.stdout);assert result['code']==0
    raw=json.loads(outfile.read_text())
    nodes=raw['nodes']
    title=next(n for n in nodes if n['type']=='composite_shape')
    baseline=title['y']+title['height']
    # 固定文字大小，只压紧自动布局中的空档；所有生命线端点、片段和折点同步变换。
    sy=lambda y:175+(y-baseline)*.80
    heads=sorted((n for n in nodes if n['type']=='life_line'),key=lambda n:n['x'])
    old_centers=[n['x']+n['width']/2 for n in heads]
    widths=[]
    for n in heads:
        label=n['text']['text']
        widths.append(330 if '数据库' in label or '主库' in label else 295 if 'PanelReplacementService' in label else 280 if 'PSM' in label or len(label.splitlines())==3 else 240)
    centers=[];right=35
    for width in widths:
        centers.append(right+width/2);right+=width+80
    def sx(x):
        if x<=old_centers[0]:return centers[0]+x-old_centers[0]
        for a,b,c,d in zip(old_centers,old_centers[1:],centers,centers[1:]):
            if x<=b:return c+(x-a)*(d-c)/(b-a)
        return centers[-1]+x-old_centers[-1]
    for n in nodes:
        oldx=n['x'];oldy=n['y'];w=n['width']
        if n['type']=='life_line':
            i=heads.index(n);n['x']=centers[i]-widths[i]/2;n['width']=widths[i];n['y']=80;n['height']=90 if len(n['text']['text'].splitlines())<3 else 100
            n['lifeline']['size']=sy(oldy+n['lifeline']['size'])-80
            db='数据库' in n['text']['text'] or '主库' in n['text']['text']
            if db:n['lifeline']['type']='data_base'
            n['text'].pop('rich_text',None)
            n['style'].update(border_color='#374151',border_color_type=1,fill_color='#DFF5E5' if db else '#F0F4FC',fill_color_type=1)
        elif n is title:
            n['x']=35;n['y']=5;n['width']=right-115;n['height']=52
            n['text']['font_size']=22;n['text']['font_weight']='bold';n['text'].pop('rich_text',None)
            n['style'].update(border_color='#374151',border_color_type=1,fill_color='#FEF1CE',fill_color_type=1)
        else:
            n['x']=sx(oldx);n['y']=sy(oldy);n['width']=sx(oldx+w)-sx(oldx)
            if n['type']=='connector':
                n['height']*=.8
                for side in ('start','end'):
                    p=n['connector'][side].get('position')
                    if p:p['x']=sx(p['x']);p['y']=sy(p['y'])
                for p in n['connector'].get('turning_points',[]):
                    p['x']=sx(oldx+p['x'])-sx(oldx);p['y']*=.8
                n['style'].update(border_color='#374151',border_color_type=1)
                for c in n['connector'].get('captions',{}).get('data',[]):c.pop('rich_text',None)
            elif n['type']=='combined_fragment':
                n['height']*=.8
                meta=n['table']['meta']
                original=meta['row_sizes'];sizes=[v*.8 for v in original]
                extra=36-sizes[0];sizes[0]=36;sizes[1]-=extra
                meta['row_sizes']=sizes;meta['col_sizes']=[n['width']]
                for cell in n['table']['cells']:
                    cell.get('text',{}).pop('rich_text',None)
                meta['style'].update(border_color='#374151',border_color_type=1,fill_color='#FFFFFF',fill_color_type=1)
            elif n['type']=='composite_shape':
                n['style'].update(border_color='#374151',border_color_type=1,fill_color='#FEF1CE',fill_color_type=1)
    assert len({n['id'] for n in nodes})==len(nodes)
    assert not any(n['type'] in ('svg','image') for n in nodes)
    assert len(heads)=={'03':4,'06':3,'07':5}[num]
    (R/f'{num}-精简原生.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2),encoding='utf-8')
    p=subprocess.run(['npx','-y','@larksuite/whiteboard-cli@^0.2.13','-i',str(src),'-o',str(R/f'{num}-精简本地.png'),'--scale','1'],capture_output=True,text=True,timeout=180)
    p.check_returncode();assert json.loads(p.stdout)['code']==0
    im=Image.open(R/f'{num}-精简本地.png');im.thumbnail((2000,3900));im.save(R/f'{num}-精简本地审阅.png')
    old=json.loads((R/f'{num}-精简前备份.json').read_text())
    before=sum(n['type']=='connector' for n in old['nodes']);after=sum(n['type']=='connector' for n in nodes)
    height=max(n['y']+n.get('lifeline',{}).get('size',n['height']) for n in nodes)
    print(num,'消息',before,'→',after,'预计画幅',round(right-80),'×',round(height),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as e:list(e.map(compact,sys.argv[1:] or NAMES))
