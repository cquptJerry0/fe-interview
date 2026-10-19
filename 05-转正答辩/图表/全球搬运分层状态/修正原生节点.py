import json,copy,math,xml.etree.ElementTree as E
from pathlib import Path
R=Path(__file__).parent
meta=json.loads((R/'布局与语义.json').read_text());raw=json.loads((R/'转换节点.json').read_text());ns=raw['nodes']
shapes=[n for n in ns if n['type']=='composite_shape']; texts=[n for n in ns if n['type']=='text_shape']; conns=[n for n in ns if n['type']=='connector']
mapid={};removed=set()
for key,b in meta['boxes'].items():
 matches=[s for s in shapes if abs(s['x']-b['x'])<2 and abs(s['y']-b['y'])<2]
 assert len(matches)==1,(key,matches)
 s=matches[0];mapid[key]=s['id'];s['width']=b['w'];s['height']=b['h'];s['composite_shape']['type']=meta['types'][key]
 owned=[t for t in texts if abs(t['x']-b['x'])<15 and b['y']-2<=t['y']<=b['y']+b['h'] and t['text']['text']==b['text']]
 if b['text']:
  assert len(owned)==1,(key,owned)
  t=owned[0];s['text']=copy.deepcopy(t['text']);s['text']['horizontal_align']='center';s['text']['vertical_align']='mid';removed.add(t['id'])
 else:s.pop('text',None)

# All intended paths come from the same source geometry; preserve exact ports.
def port(n,anchor):
 x,y,w,h=n['x'],n['y'],n['width'],n['height']
 return {'left':(x,y+h/2),'right':(x+w,y+h/2),'top':(x+w/2,y),'bottom':(x+w/2,y+h)}[anchor]
byid={n['id']:n for n in ns}
for c,m in zip(conns,meta['edges']):
 a=byid[mapid[m['a']]];b=byid[mapid[m['b']]]
 x0,y0=port(a,m['fa']);x1,y1=port(b,m['ta'])
 points=[(p['x'],p['y']) for p in m['points']]
 path=[(x0,y0)]+points+[(x1,y1)]
 x=min(p[0] for p in path);y=min(p[1] for p in path)
 c.update(x=x,y=y,width=max(1,max(p[0] for p in path)-x),height=max(1,max(p[1] for p in path)-y))
 conn=c['connector'];conn['shape']='polyline' if points else 'straight';conn['turning_points']=[{'x':xx-x,'y':yy-y} for xx,yy in points]
 for cap in conn.get('captions',{}).get('data',[]):cap['font_size']=24;cap['text_color']='#4E5969';cap['text_color_type']=1;cap['text_background_color']='#FFFFFF';cap['text_background_color_type']=1

out=[n for n in ns if n['id'] not in removed]
for i,n in enumerate(out):n['z_index']=i
ids={n['id'] for n in out}
for c in conns:
 for k in ('start','end'):assert c['connector'][k]['attached_object']['id'] in ids
assert not any(n['type']=='image' for n in out)
(R/'原生状态图.json').write_text(json.dumps({'nodes':out},ensure_ascii=False,indent=2))

# Independent SVG view of the final raw nodes for preflight, not upload artwork.
S='http://www.w3.org/2000/svg';E.register_namespace('',S)
svg=E.Element('{'+S+'}svg',{'viewBox':f"0 0 {meta['width']} {meta['height']}",'width':str(meta['width']),'height':str(meta['height'])})
def el(t,a,parent=svg):return E.SubElement(parent,'{'+S+'}'+t,{k:str(v) for k,v in a.items()})
def text(x,y,s,fs=28,color='#1F2329',anchor='middle',bold=False):
 ls=s.split('\n');t=el('text',{'x':x,'y':y,'font-size':fs,'fill':color,'text-anchor':anchor,'font-family':'Arial,PingFang SC,sans-serif','font-weight':'600' if bold else '400'})
 for i,line in enumerate(ls):el('tspan',{'x':x,'dy':0 if i==0 else fs*1.35},t).text=line
 return t
for n in out:
 if n['type']=='connector':continue
 x,y,w,h=n['x'],n['y'],n['width'],n['height'];sty=n.get('style',{});fill=sty.get('fill_color','#FFFFFF');stroke=sty.get('border_color','#D7DEE7')
 if n['type']=='composite_shape':
  kind=n['composite_shape']['type']
  if kind=='state_start':el('circle',{'cx':x+w/2,'cy':y+h/2,'r':min(w,h)/2,'fill':'#1F2329'})
  elif kind=='state_end':
   el('circle',{'cx':x+w/2,'cy':y+h/2,'r':min(w,h)/2,'fill':'white','stroke':'#1F2329','stroke-width':2});el('circle',{'cx':x+w/2,'cy':y+h/2,'r':min(w,h)*.3,'fill':'#1F2329'})
  else:el('rect',{'x':x,'y':y,'width':w,'height':h,'rx':12,'fill':fill,'stroke':stroke,'stroke-width':1.5})
  if n.get('text'):
   t=n['text'];fs=t.get('font_size',28);count=len(t['text'].split('\n'));text(x+w/2,y+h/2-(count-1)*fs*.675+fs*.33,t['text'],fs,t.get('text_color','#1F2329'))
 elif n['type']=='text_shape':
  t=n['text'];fs=t.get('font_size',28);bold=bool(t.get('rich_text')) or t.get('font_weight')=='bold';text(x,y+fs,t['text'],fs,t.get('text_color','#1F2329'),'start',bold)
for c,m in zip(conns,meta['edges']):
 a=byid[mapid[m['a']]];b=byid[mapid[m['b']]]
 path=[port(a,m['fa'])]+[(p['x'],p['y']) for p in m['points']]+[port(b,m['ta'])]
 el('polyline',{'points':' '.join(f'{x},{y}' for x,y in path),'fill':'none','stroke':'#718BAE','stroke-width':2,'stroke-dasharray':'8 6' if m['dash'] else 'none'})
 prev=next((p for p in reversed(path[:-1]) if p!=path[-1]),path[0]);end=path[-1];ang=math.atan2(end[1]-prev[1],end[0]-prev[0]);pts=[end,(end[0]-12*math.cos(ang)+5*math.sin(ang),end[1]-12*math.sin(ang)-5*math.cos(ang)),(end[0]-12*math.cos(ang)-5*math.sin(ang),end[1]-12*math.sin(ang)+5*math.cos(ang))];el('polygon',{'points':' '.join(f'{x},{y}' for x,y in pts),'fill':'#718BAE'})
 if m['label']:
  lengths=[math.dist(p,q) for p,q in zip(path,path[1:])];target=sum(lengths)/2;cum=0
  for (p,q),le in zip(zip(path,path[1:]),lengths):
   if le and cum+le>=target:
    f=(target-cum)/le;xx=p[0]+(q[0]-p[0])*f;yy=p[1]+(q[1]-p[1])*f;break
   cum+=le
  width=len(m['label'])*24+12
  el('rect',{'x':xx-width/2,'y':yy-19,'width':width,'height':30,'fill':'#FFFFFF'})
  text(xx,yy+8,m['label'],24,'#4E5969')
(R/'原生检查预览.svg').write_text(E.tostring(svg,encoding='unicode'))
report={'nodes':len(out),'connectors':len(conns),'state_start':sum(n.get('composite_shape',{}).get('type')=='state_start' for n in out),'state_end':sum(n.get('composite_shape',{}).get('type')=='state_end' for n in out),'merged_node_texts':len(removed),'bound_connectors':True,'image_nodes':0}
(R/'原生检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
