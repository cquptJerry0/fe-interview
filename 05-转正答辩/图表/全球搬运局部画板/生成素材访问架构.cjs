const fs=require('node:fs'),path=require('node:path');
const root=__dirname,name='05-素材访问控制';
const nodes=[],specs={},routes={};
const C={text:'#1F2329',sub:'#646A73',green:'#509863',greenBg:'#DFF5E5',blue:'#5178C6',blueBg:'#F0F4FC',gold:'#D4B45B',goldBg:'#FEF1CE',line:'#718BAE'};
const W=2460,H=1500;
function area(id,x,y,w,h,fill,border){nodes.push({type:'frame',id,x,y,width:w,height:h,layout:'none',gap:0,padding:0,children:[],fillColor:fill,borderColor:border,borderWidth:2,borderRadius:10});specs[id]={x,y,w,h,kind:'container'};}
function text(id,x,y,w,value,size=48,bold=false,color=C.text,align='left'){nodes.push({type:'text',id,x,y,width:w,height:'fit-content',text:value,fontSize:size,textColor:color,textAlign:align,verticalAlign:'top'});specs[id]={x,y,w,h:Math.ceil(value.split('\n').length*size*1.45+8),text:value,size,kind:'text',bold};}
function box(id,x,y,w,h,value,border,dash=false){nodes.push({type:'rect',id,x,y,width:w,height:'fit-content',text:value,fontSize:48,textColor:C.text,textAlign:'center',verticalAlign:'middle',fillColor:'#FFFFFF',borderColor:border,borderWidth:2,borderRadius:8,...(dash?{borderDash:'dashed'}:{})});specs[id]={x,y,w,h,text:value,size:48,kind:'box'};}
function edge(id,from,to,fa,ta,x,dashed,label){
 const a=specs[from],b=specs[to];
 nodes.push({type:'connector',id,connector:{from,to,fromAnchor:fa,toAnchor:ta,lineShape:'straight',lineColor:C.line,lineWidth:3,lineStyle:dashed?'dashed':'solid',startArrow:'none',endArrow:'arrow',label,labelPosition:.5}});
 routes[id]={points:[],dashed,pos:.5,label,sp:(x-a.x)/a.w,ep:(x-b.x)/b.w};
}
text('title',40,30,2380,'⑤ 素材使用准入与归属维护',64,true);
// Three real boundaries: page operations, VIMO server checks, Feed facts.
area('lane_page',30,160,2400,280,C.greenBg,C.green);
area('lane_server',30,560,2400,320,C.blueBg,C.blue);
area('lane_feed',30,1000,2400,280,C.goldBg,C.gold);
text('page_label',70,261,480,'VIMO 页面',48,true);
text('server_label',70,650,480,'VIMO 服务端',48,true);
text('server_psm',70,735,500,'ies.vimo.material_web',40,false,C.sub);
text('feed_label',70,1070,480,'Feed 素材服务',48,true);
text('feed_psm',70,1155,500,'faceu.artist.feed',40,false,C.sub);
// Page row: operations in the middle, rejection prompts at the two ends.
box('popup_redirect',620,215,320,170,'转独立弹窗\n查看新素材',C.green,true);
box('search',985,215,240,170,'搜索素材',C.green);
box('select',1270,215,360,170,'选材加入面板',C.green);
box('edit',1675,215,360,170,'编辑 / 上下线',C.green);
box('popup_owner',2080,215,320,170,'归属弹窗\n提示或确认',C.green,true);
// The two mechanisms.
area('usage',620,620,1175,200,'#FFFFFF',C.blue);
text('usage_title',650,640,1115,'使用准入',48,true,C.text,'center');
text('usage_question',650,728,1115,'当前业务还能用吗？',48,false,C.text,'center');
area('ownership',1865,620,535,200,'#FFFFFF',C.blue);
text('ownership_title',1895,640,475,'归属维护',48,true,C.text,'center');
text('ownership_question',1895,728,475,'当前业务能改吗？',48,false,C.text,'center');
// Facts read from Feed.
box('redirect_fact',620,1055,1175,170,'被哪份素材替代\nredirect_item_id',C.gold);
box('owner_fact',1865,1055,535,170,'由哪个业务维护\nowner_biz_id',C.gold);
edge('search_call','search','usage','bottom','top',1105,false,'过滤旧素材');
edge('select_call','select','usage','bottom','top',1450,false,'整批校验');
edge('edit_usage','edit','usage','bottom','top',1735,false,'先查');
edge('edit_owner','edit','ownership','bottom','top',1975,false,'再查');
edge('redirect_reject','usage','popup_redirect','top','bottom',780,true,'拒绝');
edge('owner_reject','ownership','popup_owner','top','bottom',2240,true,'拒绝');
edge('redirect_read','usage','redirect_fact','bottom','top',1207.5,true,'按当前业务读取');
edge('owner_read','ownership','owner_fact','bottom','top',2132.5,true,'读取');
text('note_shared',40,1320,2380,'页面与 OpenAPI 共用检查；写入前重新查询',48,false,C.sub);
text('note_history',40,1405,2380,'历史引用按原 ID 读取，不经过这两项检查',48,false,C.sub);
fs.writeFileSync(path.join(root,name+'.json'),JSON.stringify({version:2,nodes},null,2));
fs.writeFileSync(path.join(root,name+'-布局.json'),JSON.stringify({W,H,specs,routes},null,2));
console.log(JSON.stringify({nodes:nodes.length,edges:Object.keys(routes).length,W,H}));
