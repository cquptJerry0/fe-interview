import json,copy
from pathlib import Path
R=Path(__file__).parent
raw=json.loads((R/'03-时序转换.json').read_text())
for n in raw['nodes']:
 n['x']=n.get('x',0)+35
 if n['type']=='life_line':
  center=n['x']+n['width']/2
  name=n['text']['text']
  if name.startswith('BPM'):
   w=160
  elif '任务主库' in name:
   w=310;n['lifeline']['type']='data_base'
  else:w=260
  n['x']=center-w/2;n['width']=w;n['height']=112
  n['lifeline']['size']=140+(n['lifeline']['size']-80)*.95
  n['text']['font_size']=14
  n['text'].pop('rich_text',None)
  n['style'].update({'border_color':'#374151','border_color_type':1,'fill_color':'#DFF5E5' if '任务主库' in name else '#F0F4FC','fill_color_type':1})
 else:
  n['y']=140+(n.get('y',80)-80)*.95
  if n['type']=='combined_fragment':
   sizes=n['table']['meta']['row_sizes'];n['table']['meta']['row_sizes']=[sizes[0]]+[v*.95 for v in sizes[1:]]
   style=n['table']['meta']['style'];style.update({'border_color':'#374151','border_color_type':1,'fill_color':'#FFFFFF','fill_color_type':1})
  elif n['type']=='connector':
   n['height']*=.82
   for side in ['start','end']:
    p=n['connector'][side].get('position')
    if p:p['x']+=35;p['y']=140+(p['y']-80)*.95
   for p in n['connector'].get('turning_points',[]):p['y']*=.82
   n['style'].update({'border_color':'#374151','border_color_type':1})
   for caption in n['connector'].get('captions',{}).get('data',[]):
    text=caption.get('text','')
    if text.startswith('MGetMaterialTransferResult('):
     caption['text']='MGetMaterialTransferResult()\nexternal_task_ids：原执行编号\n批量查询素材执行结果'
    elif text.startswith('writeQueryResult()'):
     caption['text']='writeQueryResult()\n→ mergeItemResults()\n保存逐素材执行结果'
    elif text.startswith('results：status'):
     caption['text']='results：status / target_item_id\n执行状态、目标素材和失败原因'
    caption.pop('rich_text',None)
  elif n['type']=='composite_shape':
   n['style'].update({'border_color':'#374151','border_color_type':1,'fill_color':'#FEF1CE','fill_color_type':1})
assert sum(n['type']=='life_line' for n in raw['nodes'])==4
assert sum(n['type']=='combined_fragment' for n in raw['nodes'])==3
assert not any(n['type'] in ('svg','image') for n in raw['nodes'])
(R/'03-时序原生.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2),encoding='utf-8')
print('原生生命线4，条件片段3，消息21，无SVG或图片节点')
