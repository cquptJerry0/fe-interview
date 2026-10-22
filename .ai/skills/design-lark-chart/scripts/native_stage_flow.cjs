'use strict';
const fs=require('fs');
const SHAPES={action:'round_rect',decision:'diamond',end:'round_rect2',queue:'horiz_cylinder',store:'cylinder',panel:'note_shape',platform:'predefined_process',environment:'hexagon',identity:'parallelogram',pin:'rect'};
const clone=o=>JSON.parse(JSON.stringify(o));
function worldNodes(raw){
 const nodes=raw.nodes,byId=new Map(nodes.map(n=>[n.id,n])),memo=new Map();
 if(byId.size!==nodes.length)throw Error('duplicate native IDs');
 function resolve(id,stack=new Set()){
  if(memo.has(id))return memo.get(id);if(stack.has(id))throw Error('parent cycle');
  const n=byId.get(id);if(!n)throw Error('missing parent/node '+id);
  let x=n.x,y=n.y;if(n.parent_id){const p=resolve(n.parent_id,new Set([...stack,id]));x+=p.x;y+=p.y;}
  const w={...n,x,y};memo.set(id,w);return w;
 }
 nodes.forEach(n=>resolve(n.id));return memo;
}
function geometry(raw,semanticMap={}){
 const world=worldNodes(raw),names=new Map(Object.entries(semanticMap).map(([name,id])=>[id,name]));
 const edges=[];for(const n of world.values())if(n.type==='connector'){
  const c=n.connector;
  const point=end=>{const a=c[end]?.attached_object,node=world.get(a?.id);if(!node||node.type==='connector')throw Error('unbound '+n.id);const p=a.position;if(!p||!['x','y'].every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=1))throw Error('bad port '+n.id);return{x:node.x+node.width*p.x,y:node.y+node.height*p.y};};
  const a=c.start.attached_object,b=c.end.attached_object;
  if(c.shape==='polyline'&&world.get(a.id).parent_id&&world.get(a.id).parent_id===world.get(b.id).parent_id&&n.parent_id!==world.get(a.id).parent_id)throw Error('same-section connector coordinate-space mismatch '+n.id);
  const points=[point('start'),...(c.turning_points??[]).map(p=>({x:n.x+p.x,y:n.y+p.y})),point('end')].filter((p,i,all)=>!i||Math.abs(p.x-all[i-1].x)>.01||Math.abs(p.y-all[i-1].y)>.01);
  edges.push({id:n.id,name:names.get(n.id)??n.id,from:a.id,to:b.id,points,shape:c.shape});
 }
 return{nodes:[...world.values()].filter(n=>!['section','text_shape','connector'].includes(n.type)&&n.style?.border_style!=='none'&&!String(names.get(n.id)??'').startsWith('lg_')),edges,containers:[...world.values()].filter(n=>n.type==='section')};
}
function checkNative(raw,semanticMap={}){
 const g=geometry(raw,semanticMap),errors=[],warnings=[];
 const overlap=(a,b)=>Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+2&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+2;
 for(const n of raw.nodes){if(!['section','composite_shape','text_shape','connector'].includes(n.type))errors.push({code:'non-native',id:n.id});for(const k of ['x','y','width','height'])if(!Number.isFinite(n[k]))errors.push({code:'non-finite',id:n.id,key:k});}
 for(let i=0;i<g.nodes.length;i++)for(let j=i+1;j<g.nodes.length;j++)if(overlap(g.nodes[i],g.nodes[j]))errors.push({code:'node-overlap',ids:[g.nodes[i].id,g.nodes[j].id]});
 for(const e of g.edges){if(e.shape==='curve'){warnings.push({code:'curve-needs-visual-check',id:e.id});continue;}
  for(let i=0;i<e.points.length-1;i++){const a=e.points[i],b=e.points[i+1],h=Math.abs(a.y-b.y)<.1,v=Math.abs(a.x-b.x)<.1;
   if(!h&&!v){errors.push({code:'non-orthogonal',id:e.id});continue;}
   for(const n of g.nodes){if(n.id===e.from||n.id===e.to)continue;const hit=h?a.y>n.y+2&&a.y<n.y+n.height-2&&Math.min(Math.max(a.x,b.x),n.x+n.width)-Math.max(Math.min(a.x,b.x),n.x)>2:a.x>n.x+2&&a.x<n.x+n.width-2&&Math.min(Math.max(a.y,b.y),n.y+n.height)-Math.max(Math.min(a.y,b.y),n.y)>2;if(hit)errors.push({code:'edge-through-node',ids:[e.id,n.id]});}
  }
 }
 return{ok:errors.length===0,errors,warnings,metrics:{nodes:raw.nodes.length,sections:g.containers.length,connectors:g.edges.length},scope:'最终原生节点全局几何、绑定及坐标空间；文字内接区、标签和无关线交叉仍需真实导图验收'};
}
function finalize(dsl,plan,coords,converted){
 const raw=clone(converted),map=new Map(),used=new Set();
 for(const d of dsl.nodes.filter(n=>n.type!=='connector')){
  const q=coords[d.id];if(!q)throw Error('missing layout '+d.id);
  const candidates=raw.nodes.filter(n=>n.type!=='connector'&&!used.has(n.id)&&Math.abs(n.x-q.absX)<.1&&Math.abs(n.y-q.absY)<.1);
  if(candidates.length!==1)throw Error('ambiguous conversion map '+d.id);map.set(d.id,candidates[0]);used.add(candidates[0].id);
 }
 for(const[id,n]of map){const s=plan.specs[id];if(!s)throw Error('missing specification '+id);if(s.kind==='text')continue;
  Object.assign(n,{x:s.x,y:s.y,width:s.w,height:s.h});
  if(s.kind==='section'){n.type='section';n.section={title:s.title};delete n.composite_shape;delete n.text;n.style={fill_color:s.fill,fill_color_type:1,fill_opacity:100,border_style:'solid',border_width:'medium',border_opacity:100};continue;}
  if(!SHAPES[s.kind])throw Error('unknown semantic kind '+s.kind);n.type='composite_shape';n.composite_shape={type:SHAPES[s.kind]};
  if(s.kind==='pin'){n.style={fill_opacity:0,border_style:'none'};n.text.text='';}
  else if(n.text){n.text.font_size=s.fontSize??(s.kind==='decision'?28:32);n.text.font_weight='regular';n.text.vertical_align='mid';n.text.angle=0;n.text.text=s.title+(s.sub?'\n'+s.sub:'');if(s.kind==='decision'||s.plainText)delete n.text.rich_text;}
  if(s.section)n.parent_id=map.get(s.section)?.id;
 }
 for(const p of plan.sections){const h=map.get(p.id+'_header');if(!h)continue;
  h.type='composite_shape';h.composite_shape={type:'round_rect'};Object.assign(h,{x:p.x+40,y:p.headerY??470,width:p.w-80,height:p.headerHeight??95});h.text.text=p.service;h.text.font_size=p.headerFontSize??28;h.text.horizontal_align='left';h.text.vertical_align='mid';delete h.text.rich_text;h.style={fill_color:p.fill,fill_color_type:1,fill_opacity:100,border_style:'none'};h.parent_id=map.get(p.id).id;
 }
 const es=dsl.nodes.filter(n=>n.type==='connector'),rs=raw.nodes.filter(n=>n.type==='connector');if(es.length!==rs.length)throw Error('connector count mismatch');
 const semanticMap=Object.fromEntries([...map].map(([id,n])=>[id,n.id]));
 const attach=(n,side,p=.5)=>({id:n.id,snap_to:side,position:['left','right'].includes(side)?{x:side==='right'?1:0,y:p}:{x:p,y:side==='bottom'?1:0}});
 const point=(n,a)=>({x:n.x+n.width*a.position.x,y:n.y+n.height*a.position.y});
 for(let i=0;i<es.length;i++){const d=es[i],r=plan.routes[d.id],n=rs[i],a=map.get(d.connector.from),b=map.get(d.connector.to);if(!r||!a||!b)throw Error('unknown route endpoint '+d.id);
  const sa=attach(a,r.fa,r.sp),ea=attach(b,r.ta,r.ep),sp=point(a,sa),ep=point(b,ea);let turns=r.points??[];
  if(!turns.length&&Math.abs(sp.x-ep.x)>.1&&Math.abs(sp.y-ep.y)>.1){if(['top','bottom'].includes(r.fa)){const y=(sp.y+ep.y)/2;turns=[{x:sp.x,y},{x:ep.x,y}];}else{const x=(sp.x+ep.x)/2;turns=[{x,y:sp.y},{x,y:ep.y}];}}
  const pts=[sp,...turns,ep].filter((p,j,all)=>!j||Math.abs(p.x-all[j-1].x)>.01||Math.abs(p.y-all[j-1].y)>.01),x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y));Object.assign(n,{x,y,width:Math.max(1,Math.max(...pts.map(p=>p.x))-x),height:Math.max(1,Math.max(...pts.map(p=>p.y))-y)});
  n.connector.start.attached_object=sa;n.connector.start_object=sa;n.connector.end.attached_object=ea;n.connector.end_object=ea;n.connector.shape=pts.length>2?'polyline':'straight';n.connector.turning_points=pts.slice(1,-1).map(p=>({x:p.x-x,y:p.y-y}));
  if(a.parent_id&&a.parent_id===b.parent_id)n.parent_id=a.parent_id;else delete n.parent_id;
  n.style={...n.style,border_width:r.dash?'medium':'bold',border_style:r.dash?'dash':'solid',border_color:r.dash?'#626F80':'#454F5D',border_color_type:1,border_opacity:100};
  for(const t of n.connector.captions?.data??[]){t.font_size=26;t.text_color='#454F5D';t.text_color_type=1;}n.connector.caption_position=r.pos;semanticMap[d.id]=n.id;
 }
 raw.nodes.sort((a,b)=>(a.type==='section'?0:1)-(b.type==='section'?0:1));raw.nodes.forEach((n,i)=>n.z_index=i);
 const world=new Map(raw.nodes.map(n=>[n.id,{x:n.x,y:n.y}]));
 for(const n of raw.nodes)if(n.parent_id){const p=world.get(n.parent_id);if(!p)throw Error('missing parent');n.x-=p.x;n.y-=p.y;}
 const report=checkNative(raw,semanticMap);if(!report.ok)throw Error(JSON.stringify(report));return{raw,semanticMap,report,geometry:geometry(raw,semanticMap)};
}
module.exports={SHAPES,worldNodes,geometry,checkNative,finalize};
if(require.main===module){
 const args=process.argv.slice(2);if(args.length!==2){console.error('Usage: node native_stage_flow.cjs <native.json> <semantic-map.json>');process.exit(2);}
 try{const r=checkNative(JSON.parse(fs.readFileSync(args[0],'utf8')),JSON.parse(fs.readFileSync(args[1],'utf8')));console.log(JSON.stringify(r,null,2));process.exitCode=r.ok?0:1;}catch(e){console.error(e.message);process.exitCode=1;}
}
