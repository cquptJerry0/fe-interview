const fs=require('node:fs'),path=require('node:path');
const root=__dirname,num=process.argv[2];
const dsl=JSON.parse(fs.readFileSync(path.join(root,num+'.json')));
const input=JSON.parse(fs.readFileSync(path.join(root,num+'-转换.json')));
const raw=input.nodes?input:input.data?.result??input;
const plan=JSON.parse(fs.readFileSync(path.join(root,num+'-设计.json')));
const map=new Map(),originals=dsl.nodes.filter(n=>n.type!=='connector'),available=raw.nodes.filter(n=>n.type!=='connector');
for(const d of originals){
 const n=available.find(n=>!mapHas(n.id)&&Math.abs(n.x-d.x)<1&&Math.abs(n.y-d.y)<1&&(d.text===undefined||(n.text?.text??'')===(typeof d.text==='string'?d.text:'')));
 function mapHas(id){return [...map.values()].some(n=>n.id===id);}
 if(!n)throw Error('missing '+d.id);map.set(d.id,n);
 const s=plan.specs[d.id];
 if(s.kind!=='text'&&s.kind!=='container'){
  n.x=s.x;n.y=s.y;n.width=s.w;n.height=s.h;
  n.composite_shape.type=s.kind==='decision'?'diamond':s.kind==='store'?'cylinder':s.kind==='platform'?'predefined_process':'round_rect';
 }
 if(n.text&&(d.id==='title'||d.id.endsWith('_title')||d.id.endsWith('_name')))n.text.font_weight='bold';
 if(s.kind==='pin'){n.style={border_style:'none',fill_opacity:0};}
 if(s.kind==='activation'){n.composite_shape.type='rect';}
}
const attach=(n,side,pos=.5)=>({id:n.id,snap_to:side,position:side==='left'||side==='right'?{x:side==='right'?1:0,y:pos}:{x:pos,y:side==='bottom'?1:0}});
const point=(n,a)=>({x:n.x+n.width*a.position.x,y:n.y+n.height*a.position.y});
const es=dsl.nodes.filter(n=>n.type==='connector'),rs=raw.nodes.filter(n=>n.type==='connector');
if(es.length!==rs.length)throw Error('edges lost');
const geometry=[];
for(let i=0;i<es.length;i++){
 const d=es[i],n=rs[i],e=d.connector,r=plan.routes[d.id],a=map.get(e.from),b=map.get(e.to);
 let sa=attach(a,e.fromAnchor),ea=attach(b,e.toAnchor),turns=r.points??[];
 const sp=point(a,sa),ep=point(b,ea);
 if(!turns.length&&Math.abs(sp.x-ep.x)>.01&&Math.abs(sp.y-ep.y)>.01){
  const x=(sp.x+ep.x)/2;turns=[{x,y:sp.y},{x,y:ep.y}];
 }
 let pts=[sp,...turns,ep];
 pts=pts.filter((p,j)=>j===0||Math.abs(p.x-pts[j-1].x)>.01||Math.abs(p.y-pts[j-1].y)>.01);
 const x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y));
 Object.assign(n,{x,y,width:Math.max(1,Math.max(...pts.map(p=>p.x))-x),height:Math.max(1,Math.max(...pts.map(p=>p.y))-y)});
 Object.assign(n.connector,{start_object:sa,end_object:ea,turning_points:pts.slice(1,-1).map(p=>({x:p.x-x,y:p.y-y})),shape:pts.length>2?'polyline':'straight',caption_position:r.pos??.5});
 n.connector.start.attached_object=sa;n.connector.end.attached_object=ea;
 if(e.label){
  const cs=n.connector.captions?.data??[];for(const c of cs){c.font_size=30;c.text_color='#1F2329';c.text_color_type=1;}
 }
 geometry.push({id:d.id,from:e.from,to:e.to,points:pts,label:e.label??'',noArrow:r.noArrow??false});
}
const containers=new Set(Object.entries(plan.specs).filter(([id,s])=>s.kind==='container').map(([id])=>map.get(id).id));
raw.nodes.sort((a,b)=>Number(!containers.has(a.id))-Number(!containers.has(b.id)));
raw.nodes.forEach((n,i)=>n.z_index=i);
const ids=new Set(raw.nodes.map(n=>n.id));
for(const n of rs)for(const key of ['start','end'])if(!ids.has(n.connector[key].attached_object?.id))throw Error('unbound');
if(raw.nodes.some(n=>['svg','image'].includes(n.type)))throw Error('not native');
const solid=[...map.entries()].filter(([id])=>!['container','pin','activation'].includes(plan.specs[id].kind));
const overlaps=[];
for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++){
 const [id,a]=solid[i],[jd,b]=solid[j];
 if(Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+2&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+2)overlaps.push([id,jd]);
}
if(overlaps.length)throw Error('overlap '+JSON.stringify(overlaps));
fs.writeFileSync(path.join(root,num+'-原生.json'),JSON.stringify(raw,null,2));
fs.writeFileSync(path.join(root,num+'-几何.json'),JSON.stringify({nodes:Object.fromEntries(map),edges:geometry},null,2));
// Preview derives from final native geometry and connector binding, not a separate layout.
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${plan.W}" height="${plan.H}" viewBox="0 0 ${plan.W} ${plan.H}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#718BAE" stroke-width="1.5"/></marker></defs><rect width="100%" height="100%" fill="white"/>`;
function shape(n){
 const type=n.composite_shape?.type;const fill=n.style?.fill_opacity===0?'none':n.style?.fill_color??'none',stroke=n.style?.border_style==='none'?'none':n.style?.border_color??'none';
 if(type==='diamond')return `<polygon points="${n.x+n.width/2},${n.y} ${n.x+n.width},${n.y+n.height/2} ${n.x+n.width/2},${n.y+n.height} ${n.x},${n.y+n.height/2}" fill="${fill}" stroke="${stroke}"/>`;
 return `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="${type==='rect'?0:10}" fill="${fill}" stroke="${stroke}" stroke-width="2" ${n.style?.border_style==='dash'?'stroke-dasharray="7 5"':''}/>`;
}
for(const n of raw.nodes.filter(n=>containers.has(n.id)))svg+=shape(n);
for(const g of geometry){const rn=rs[geometry.indexOf(g)];svg+=`<polyline points="${g.points.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="#718BAE" stroke-width="2" ${rn.style?.border_style==='dash'?'stroke-dasharray="7 5"':''} ${g.noArrow?'':'marker-end="url(#arrow)"'}/>`;}
for(const [id,n] of map){
 if(!containers.has(n.id)&&n.type==='composite_shape')svg+=shape(n);
 if(n.text){const t=n.text,lines=t.text.split('\n'),size=t.font_size;
 const center=t.horizontal_align==='center';const x=center?n.x+n.width/2:n.x;
 const top=n.type==='text_shape'?n.y+size:n.y+n.height/2-(lines.length-1)*size*.7+size*.35;
 svg+=`<text x="${x}" y="${top}" font-size="${size}" font-family="PingFang SC,Arial,sans-serif" text-anchor="${center?'middle':'start'}" fill="${t.text_color??'#1F2329'}" font-weight="${t.font_weight==='bold'?600:400}">${lines.map((s,i)=>`<tspan x="${x}" dy="${i?size*1.4:0}">${esc(s)}</tspan>`).join('')}</text>`;
 }
}
for(const g of geometry)if(g.label){
 const segments=g.points.slice(1).map((p,i)=>({a:g.points[i],b:p,len:Math.abs(p.x-g.points[i].x)+Math.abs(p.y-g.points[i].y)}));
 const best=segments.reduce((a,b)=>a.len>b.len?a:b);const x=(best.a.x+best.b.x)/2,y=(best.a.y+best.b.y)/2-10;
 const fs=30,w=g.label.length*fs;
 svg+=`<rect x="${x-w/2-5}" y="${y-fs}" width="${w+10}" height="${fs+5}" fill="white" fill-opacity=".92"/><text x="${x}" y="${y}" font-size="${fs}" font-family="PingFang SC,Arial,sans-serif" text-anchor="middle" fill="#1F2329">${esc(g.label)}</text>`;
}
svg+='</svg>';fs.writeFileSync(path.join(root,num+'-本地预览.svg'),svg);
console.log(JSON.stringify({num,nodes:raw.nodes.length,edges:rs.length,allNative:true,overlaps:0}));
