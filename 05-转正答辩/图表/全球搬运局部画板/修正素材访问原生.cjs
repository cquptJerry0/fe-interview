const fs=require('node:fs'),path=require('node:path');
const root=__dirname,name='05-素材访问控制';
const dsl=JSON.parse(fs.readFileSync(path.join(root,name+'.json')));
const raw=JSON.parse(fs.readFileSync(path.join(root,name+'-转换.json')));
const plan=JSON.parse(fs.readFileSync(path.join(root,name+'-布局.json')));
const map=new Map(),used=new Set();
for(const d of dsl.nodes.filter(n=>n.type!=='connector')){
 const n=raw.nodes.find(n=>!used.has(n.id)&&n.type!=='connector'&&Math.abs(n.x-d.x)<.1&&Math.abs(n.y-d.y)<.1&&(d.text===undefined||n.text?.text===d.text));
 if(!n)throw Error('missing node '+d.id);used.add(n.id);map.set(d.id,n);
 const s=plan.specs[d.id];Object.assign(n,{x:s.x,y:s.y,width:s.w,height:s.h});
 if(n.composite_shape)n.composite_shape.type='round_rect';
 if(n.text){n.text.font_size=s.size??48;n.text.font_weight=s.bold?'bold':'regular';}
}
const attach=(n,side,pos=.5)=>({id:n.id,snap_to:side,position:side==='left'||side==='right'?{x:side==='right'?1:0,y:pos}:{x:pos,y:side==='bottom'?1:0}});
const point=(n,a)=>({x:n.x+n.width*a.position.x,y:n.y+n.height*a.position.y});
const re=raw.nodes.filter(n=>n.type==='connector'),de=dsl.nodes.filter(n=>n.type==='connector');
if(re.length!==de.length)throw Error('connector count');
const edges=[];
for(let i=0;i<de.length;i++){
 const d=de[i],n=re[i],e=d.connector,r=plan.routes[d.id];
 const a=map.get(e.from),b=map.get(e.to),sa=attach(a,e.fromAnchor,r.sp),ea=attach(b,e.toAnchor,r.ep);
 const sp=point(a,sa),ep=point(b,ea);let pts=[sp,...r.points,ep];
 pts=pts.filter((p,j)=>!j||p.x!==pts[j-1].x||p.y!==pts[j-1].y);
 for(let j=1;j<pts.length;j++)if(Math.abs(pts[j].x-pts[j-1].x)>.01&&Math.abs(pts[j].y-pts[j-1].y)>.01)throw Error('diagonal '+d.id);
 const x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y));
 Object.assign(n,{x,y,width:Math.max(1,Math.max(...pts.map(p=>p.x))-x),height:Math.max(1,Math.max(...pts.map(p=>p.y))-y)});
 Object.assign(n.connector,{start_object:sa,end_object:ea,turning_points:pts.slice(1,-1).map(p=>({x:p.x-x,y:p.y-y})),shape:pts.length>2?'polyline':'straight',caption_position:r.pos,caption_auto_direction:false,specified_coordinate:true});
 n.connector.start.attached_object=sa;n.connector.end.attached_object=ea;
 n.style.border_style=r.dashed?'dash':'solid';n.style.border_color='#718BAE';n.style.border_width='medium';
 if(r.label){for(const t of n.connector.captions?.data??[]){t.font_size=48;t.text_color='#1F2329';t.text_color_type=1;}}
 else delete n.connector.captions;
 edges.push({id:d.id,from:e.from,to:e.to,points:pts,dashed:r.dashed,label:r.label,pos:r.pos});
}
const containers=new Set(Object.entries(plan.specs).filter(([id,s])=>s.kind==='container').map(([id])=>map.get(id).id));
raw.nodes.sort((a,b)=>Number(!containers.has(a.id))-Number(!containers.has(b.id)));raw.nodes.forEach((n,i)=>n.z_index=i);
const ids=new Set(raw.nodes.map(n=>n.id));for(const n of re)for(const side of ['start','end'])if(!ids.has(n.connector[side].attached_object.id))throw Error('unbound');
if(raw.nodes.some(n=>['svg','image'].includes(n.type)))throw Error('non-native');
fs.writeFileSync(path.join(root,name+'-原生.json'),JSON.stringify(raw,null,2));
fs.writeFileSync(path.join(root,name+'-几何.json'),JSON.stringify({W:plan.W,H:plan.H,nodes:Object.fromEntries(map),specs:plan.specs,edges},null,2));
console.log(JSON.stringify({nodes:raw.nodes.length,connectors:re.length,native:true,minFont:Math.min(...raw.nodes.filter(n=>n.text?.text).map(n=>n.text.font_size))}));
