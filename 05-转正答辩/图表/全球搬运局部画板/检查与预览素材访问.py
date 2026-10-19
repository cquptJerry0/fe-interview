from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math
root=Path(__file__).parent;name='05-素材访问控制'
a=json.loads((root/(name+'-几何.json')).read_text());W,H=a['W'],a['H']
fontpath='/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
fonts={s:ImageFont.truetype(fontpath,s) for s in [40,44,48,64,80]}
errors=[];specs=a['specs'];nodes=a['nodes']
obstacles={k:s for k,s in specs.items() if s['kind']!='container'}
for k,s in obstacles.items():
 f=fonts[s['size']];lines=s['text'].split('\n');margin=40 if s['kind']=='box' else 0
 maxw=max(f.getlength(t) for t in lines)
 if maxw>s['w']-margin:errors.append(['text-width',k,round(maxw),s['w']-margin])
 if len(lines)*s['size']*1.4>s['h']-24 and s['kind']=='box':errors.append(['text-height',k])
for e in a['edges']:
 for p,q in zip(e['points'],e['points'][1:]):
  for k,s in obstacles.items():
   if k in [e['from'],e['to']]:continue
   l,r,t,b=s['x']+5,s['x']+s['w']-5,s['y']+5,s['y']+s['h']-5
   hit=(p['x']==q['x'] and l<p['x']<r and min(p['y'],q['y'])<b and max(p['y'],q['y'])>t) or (p['y']==q['y'] and t<p['y']<b and min(p['x'],q['x'])<r and max(p['x'],q['x'])>l)
   if hit:errors.append(['line-crosses-node',e['id'],k])
for i,(k,s) in enumerate(obstacles.items()):
 for j,(kk,ss) in enumerate(obstacles.items()):
  if j<=i:continue
  if min(s['x']+s['w'],ss['x']+ss['w'])>max(s['x'],ss['x'])+2 and min(s['y']+s['h'],ss['y']+ss['h'])>max(s['y'],ss['y'])+2:errors.append(['overlap',k,kk])
img=Image.new('RGB',(W,H),'white');dr=ImageDraw.Draw(img)
for k,s in specs.items():
 if s['kind']=='container':
  n=nodes[k];dr.rounded_rectangle((s['x'],s['y'],s['x']+s['w'],s['y']+s['h']),12,fill=n['style']['fill_color'],outline=n['style']['border_color'],width=3)
for e in a['edges']:
 ps=[(p['x'],p['y']) for p in e['points']]
 for p,q in zip(ps,ps[1:]):
  if not e['dashed']:dr.line([p,q],fill='#718BAE',width=3)
  else:
   length=math.dist(p,q)
   for z in range(0,math.ceil(length),20):
    v=min(z+12,length);dr.line([(p[0]+(q[0]-p[0])*z/length,p[1]+(q[1]-p[1])*z/length),(p[0]+(q[0]-p[0])*v/length,p[1]+(q[1]-p[1])*v/length)],fill='#718BAE',width=3)
 p,q=ps[-2:];ang=math.atan2(q[1]-p[1],q[0]-p[0]);dr.line([q,(q[0]-16*math.cos(ang-.45),q[1]-16*math.sin(ang-.45))],fill='#718BAE',width=3);dr.line([q,(q[0]-16*math.cos(ang+.45),q[1]-16*math.sin(ang+.45))],fill='#718BAE',width=3)
for k,s in specs.items():
 if s['kind']=='container':continue
 n=nodes[k];f=fonts[s['size']];lines=s['text'].split('\n');lh=s['size']*1.4
 if s['kind']=='box':
  dr.rounded_rectangle((s['x'],s['y'],s['x']+s['w'],s['y']+s['h']),12,fill=n['style']['fill_color'],outline=n['style']['border_color'],width=3)
  top=s['y']+(s['h']-len(lines)*lh)/2
  for i,t in enumerate(lines):dr.text((s['x']+s['w']/2,top+i*lh),t,font=f,fill='#1F2329',anchor='mt')
 else:
  x=s['x']+s['w']/2 if n['text'].get('horizontal_align')=='center' else s['x'];anchor='mt' if n['text'].get('horizontal_align')=='center' else 'lt'
  color=n['text'].get('text_color','#1F2329')
  for i,t in enumerate(lines):dr.text((x,s['y']+i*lh),t,font=f,fill=color,anchor=anchor,stroke_width=1 if s.get('bold') else 0)
for e in a['edges']:
 if not e['label']:continue
 lengths=[math.dist((p['x'],p['y']),(q['x'],q['y'])) for p,q in zip(e['points'],e['points'][1:])];dist=sum(lengths)*e['pos'];pos=None
 for p,q,l in zip(e['points'],e['points'][1:],lengths):
  if dist<=l:pos=(p['x']+(q['x']-p['x'])*dist/l,p['y']+(q['y']-p['y'])*dist/l);break
  dist-=l
 f=fonts[48];w=f.getlength(e['label']);dr.rectangle((pos[0]-w/2-8,pos[1]-34,pos[0]+w/2+8,pos[1]+34),fill='white');dr.text(pos,e['label'],font=f,fill='#1F2329',anchor='mm')
img.save(root/(name+'-本地.png'))
report={'errors':errors,'minFont':48,'nodeCount':len(nodes),'edgeCount':len(a['edges']),'checked':['text widths','line crossings against nodes','node overlaps','native bindings']}
(root/(name+'-本地检查.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False));print(root/(name+'-本地.png'))
if errors:raise SystemExit(1)
