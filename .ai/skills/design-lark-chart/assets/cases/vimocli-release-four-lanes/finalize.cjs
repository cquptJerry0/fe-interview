const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const dsl=JSON.parse(fs.readFileSync(path.join(root,'board.json')));
const board=JSON.parse(fs.readFileSync(path.join(root,'converted.json')));
const plan=JSON.parse(fs.readFileSync(path.join(root,'decisions.json')));
const map=new Map();
for(const d of dsl.nodes.filter(n=>n.type!=='connector')){
 const n=board.nodes.find(n=>n.type!=='connector'&&Math.abs(n.x-d.x)<1&&Math.abs(n.y-d.y)<1&&Math.abs(n.width-d.width)<1&&(d.text===undefined||(n.text?.text??'')===d.text));
 if(!n)throw Error('转换缺少节点 '+d.id);
 map.set(d.id,n);
 const spec=plan.specs[d.id];
 if(spec){
  const extra={person:48,credential:36,file:42,platform:24,runner:24,store:16,action:12}[spec.kind]??0;
  n.height+=extra;
  if(spec.kind==='platform')n.height=Math.max(130,n.height);
  if(spec.kind==='credential')n.height=Math.max(130,n.height);
  if(spec.height)n.height=spec.height;
  if(spec.lane==='legend')n.height=64;
  n.y=spec.cy-n.height/2;
  n.composite_shape.type=plan.shape_rules[spec.kind];
 }
}
const edgeSpecs=dsl.nodes.filter(n=>n.type==='connector'),connectors=board.nodes.filter(n=>n.type==='connector');
const attach=(n,side,pos=.5)=>({id:n.id,snap_to:side,position:side==='left'||side==='right'?{x:side==='right'?1:0,y:pos}:{x:pos,y:side==='bottom'?1:0}});
const point=(n,a)=>({x:n.x+n.width*a.position.x,y:n.y+n.height*a.position.y});
const geometry=[];
for(let i=0;i<edgeSpecs.length;i++){
 const d=edgeSpecs[i],e=d.connector,n=connectors[i],a=map.get(e.from),b=map.get(e.to);
 if(!a||!b)throw Error('未解析连线 '+d.id);
 let start=attach(a,e.fromAnchor),end=attach(b,e.toAnchor),turns=[];
 const ac=a.x+a.width/2,bc=b.x+b.width/2,ay=a.y+a.height/2,by=b.y+b.height/2;
 if(e.from==='tag')start=attach(a,'right',(by-a.y)/a.height);
 if(e.to==='tag')end=attach(b,'left',(ay-b.y)/b.height);
 if(e.lineStyle==='dashed'&&a.y<b.y){
  const x=Math.max(a.x+12,Math.min(a.x+a.width-12,bc));
  if(x>=b.x+12&&x<=b.x+b.width-12){start=attach(a,'bottom',(x-a.x)/a.width);end=attach(b,'top',(x-b.x)/b.width);}
 }
 if(d.id.endsWith('-detail')||d.id==='old-detail'){
  start=attach(a,'bottom',Math.max(.05,Math.min(.95,(bc-a.x)/a.width)));end=attach(b,'top');
 }
 if(d.id.startsWith('old-branch')){
  start=attach(a,'right',Math.max(.18,Math.min(.82,(ay+(by-ay)*.6-a.y)/a.height)));
  const sp=point(a,start),ep=point(b,end),x=(sp.x+ep.x)/2;
  turns=[{x,y:sp.y},{x,y:ep.y}];
 }
 if(d.id==='record-write'){
  start=attach(a,'bottom');end=attach(b,'left');
  // 从两个阶段之间的留白进入记录，不穿过沙箱等待节点。
  const x=(a.x+a.width+b.x)/2;
  turns=[{x:ac,y:a.y+a.height+80},{x,y:a.y+a.height+80},{x,y:by}];
 }
 if(d.id==='image-deploy'){
  start=attach(a,'bottom');end=attach(b,'right');turns=[{x:ac,y:by}];
 }
 let sp=point(a,start),ep=point(b,end);
 if(!turns.length&&Math.abs(sp.x-ep.x)>.01&&Math.abs(sp.y-ep.y)>.01){
  if(e.lineStyle==='solid'){const x=(sp.x+ep.x)/2;turns=[{x,y:sp.y},{x,y:ep.y}];}
  else {const y=(sp.y+ep.y)/2;turns=[{x:sp.x,y},{x:ep.x,y}];}
 }
 const points=[sp,...turns,ep].filter((p,j,a)=>!j||Math.abs(p.x-a[j-1].x)>.01||Math.abs(p.y-a[j-1].y)>.01);
 turns=points.slice(1,-1);
 const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
 Object.assign(n,{x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y});
 n.connector.start.attached_object=start;n.connector.start_object=start;
 n.connector.end.attached_object=end;n.connector.end_object=end;
 n.connector.shape=turns.length?'polyline':'straight';
 n.connector.turning_points=turns.map(p=>({x:p.x-x,y:p.y-y}));
 for(const c of n.connector.captions?.data??[])c.font_size=26;
 // 上排任务的依赖标签避开下排触发线，标签仍绑定在原生连线上。
 if(e.lineStyle==='dashed'&&plan.specs[e.from]?.lane==='main'&&ay===plan.grid.upper)n.connector.caption_position=.78;
 if((d.id.endsWith('-detail')||d.id==='old-detail')&&by===plan.grid.lower)n.connector.caption_position=.8;
 geometry.push({id:d.id,from:e.from,to:e.to,style:e.lineStyle,start,end,points});
}
const containerIds=new Set(dsl.nodes.filter(n=>n.type==='frame').map(n=>map.get(n.id).id));
board.nodes.sort((a,b)=>Number(!containerIds.has(a.id))-Number(!containerIds.has(b.id)));
board.nodes.forEach((n,i)=>n.z_index=i);
const ids=new Set(board.nodes.map(n=>n.id));
for(const n of connectors)for(const e of ['start','end'])if(!ids.has(n.connector[e].attached_object?.id))throw Error('悬空连接');
if(board.nodes.some(n=>['image','svg'].includes(n.type)))throw Error('不允许整图图片或 SVG');
const bounds=Object.fromEntries([...map].map(([id,n])=>[id,{id:n.id,x:n.x,y:n.y,width:n.width,height:n.height,text:n.text?.text,kind:plan.specs[id]?.kind,lane:plan.specs[id]?.lane}]));
const business=Object.entries(bounds).filter(([id,n])=>n.lane&&n.lane!=='legend');
const overlap=[];
for(let i=0;i<business.length;i++)for(let j=i+1;j<business.length;j++){
 const [ai,a]=business[i],[bi,b]=business[j];
 if(Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y))overlap.push([ai,bi]);
}
if(overlap.length)throw Error('原生形状调整后重叠 '+JSON.stringify(overlap));
const laneMap=new Map(plan.rows.map(r=>[r.id,r]));
for(const [id,n]of business){const lane=laneMap.get(n.lane);if(!lane||n.y<lane.top||n.y+n.height>lane.bottom)throw Error('节点超出所属通道 '+id);}
const hits=[];
for(const e of geometry){
 const points=e.points;
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],horizontal=Math.abs(a.y-b.y)<.01;
  if(!horizontal&&Math.abs(a.x-b.x)>.01)throw Error('非正交连线 '+e.id);
  for(const [id,n]of business){
   if(id===e.from||id===e.to)continue;
   const hit=horizontal?a.y>n.y+.01&&a.y<n.y+n.height-.01&&Math.min(Math.max(a.x,b.x),n.x+n.width)-Math.max(Math.min(a.x,b.x),n.x)>.01:a.x>n.x+.01&&a.x<n.x+n.width-.01&&Math.min(Math.max(a.y,b.y),n.y+n.height)-Math.max(Math.min(a.y,b.y),n.y)>.01;
   if(hit)hits.push([e.id,id]);
  }
 }
 if(e.id.startsWith('main-')||e.id.startsWith('tag-')){
  if(points.some(p=>Math.abs(p.y-points[0].y)>.01)||points.at(-1).x<=points[0].x)throw Error('主流程不是水平向右 '+e.id);
 }
}
if(hits.length)throw Error('连线穿过其他节点 '+JSON.stringify(hits));
fs.writeFileSync(path.join(root,'board.openapi.json'),JSON.stringify(board,null,2));
fs.writeFileSync(path.join(root,'geometry.json'),JSON.stringify({nodes:bounds,edges:geometry},null,2));
console.log(JSON.stringify({nodes:board.nodes.length,connectors:connectors.length,overlaps:overlap.length,edgeThroughNode:hits.length,lanesAligned:true}));
