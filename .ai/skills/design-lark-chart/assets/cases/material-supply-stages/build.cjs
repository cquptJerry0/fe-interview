const fs=require('fs'),path=require('path');
const dir=path.resolve(process.argv[2]||process.cwd());
if(!fs.existsSync(dir)||!fs.statSync(dir).isDirectory())throw Error("output directory must exist");
const W=6350,H=2210;
const C={ink:'#1F2329',muted:'#454B54',line:'#454F5D',dash:'#626F80',border:'#687587',action:'#FFFFFF',decision:'#FEF1CE',store:'#EAE2FE',queue:'#DFF5E5',result:'#EAE2FE'};
const ns=[],es=[],specs={},routes={};
const sections=[{id:'stage_event',x:40,w:1030,title:'1  事件接入',fill:'#EEF3FF',service:'事件处理 FaaS\nies.vimo.material_lua_check'},
{id:'stage_plan',x:1214,w:1770,title:'2  面板同步建单',fill:'#EFF9F8',service:'VIMO 素材服务\nies.vimo.material_web'},
{id:'stage_execute',x:3128,w:1080,title:'3  内容执行',fill:'#F0F8F1',service:'VIMO 素材服务\nies.vimo.material_web'},
{id:'stage_publish',x:4352,w:1958,title:'4  正式发布',fill:'#F5F6F8',service:'VIMO 素材服务\nies.vimo.material_web'}];
function text(id,x,y,w,s,size=32,bold=false){ns.push({id,type:'text',x,y,width:w,height:'fit-content',text:bold?[{content:s,fontSize:size,bold:true,color:C.ink}]:s,fontSize:size,textColor:C.ink,textAlign:'left'});specs[id]={kind:'text',x,y,w,s,size};}
function add(id,x,cy,w,h,title,sub='',kind='action',section=null){
 const type=kind==='decision'?'diamond':kind==='store'?'cylinder':kind==='end'?'ellipse':'rect';
 const fill=kind==='decision'?C.decision:kind==='store'?C.store:kind==='queue'?C.queue:kind==='end'?C.result:C.action;
 ns.push({id,type,x,y:cy-h/2,width:w,height:'fit-content',text:[{content:title,bold:true,fontSize:32,color:C.ink},...(sub?[{content:'\n'+sub,fontSize:27,color:C.muted}]:[])],fontSize:32,textColor:C.ink,textAlign:'center',verticalAlign:'middle',fillColor:fill,borderColor:C.border,borderWidth:3,borderRadius:12});
 specs[id]={x,y:cy-h/2,w,h,title,sub,kind,section};
}
function link(id,from,to,label='',fa='right',ta='left',dash=false,points=null,opt={}){
 es.push({id,type:'connector',connector:{from,to,fromAnchor:fa,toAnchor:ta,lineShape:points?'polyline':'straight',lineColor:dash?C.dash:C.line,lineWidth:dash?3:4,lineStyle:dash?'dashed':'solid',endArrow:opt.noArrow?'none':'triangle',...(label?{label}:{}),...(points?{waypoints:points}:{})}});
 routes[id]={fa,ta,dash,points,sp:opt.sp??.5,ep:opt.ep??.5,noArrow:opt.noArrow??false,pos:opt.pos??.5};
}
text('title',55,30,W-100,'图片文字模板自动供给',50,true);
// Compact, single legend rail. Samples are native shapes and captions are only here.
const legend=[['lg_action','action','业务处理',90,220],['lg_decision','decision','条件判断',1070,160],['lg_queue','queue','消息队列',2030,180],['lg_store','store','数据库表',3000,150],['lg_end','end','起点／结果',3980,180]];
for(const [id,k,label,x,w]of legend){add(id,x,210,w,94,'','',k);text(id+'_text',x+w+28,186,350,label,30);}
add('lg_line_a',4870,210,1,1,'','','pin');add('lg_line_b',5140,210,1,1,'','','pin');link('lg_solid','lg_line_a','lg_line_b');text('lg_solid_text',5180,170,420,'业务流转',30);
add('lg_dash_a',4870,270,1,1,'','','pin');add('lg_dash_b',5140,270,1,1,'','','pin');link('lg_dashed','lg_dash_a','lg_dash_b','','right','left',true);text('lg_dashed_text',5180,247,1050,'数据读写／定时调用',30);
for(const p of sections){ns.push({id:p.id,type:'frame',x:p.x,y:355,width:p.w,height:1760,layout:'none',gap:0,padding:0,fillColor:p.fill,borderWidth:1,borderColor:p.fill,children:[]});specs[p.id]={kind:'section',x:p.x,y:355,w:p.w,h:1760,title:p.title,fill:p.fill};text(p.id+'_header',p.x+40,390,p.w-80,p.title+'\n'+p.service,34,true);specs[p.id+'_header'].section=p.id;}
// Business objects and their exact Chinese + key names are inside their cards.
add('source_panel',1280,650,470,170,'来源：视频文字模板面板','text-template\n来源分类／发布版本','panel','stage_plan');
add('config',2030,650,810,190,'分类同步配置','category_auto_sync_config','store','stage_plan');
add('target_draft',3420,650,720,170,'目标：图片文字模板面板','image-editor-text-template\n内测内容 · Draft','panel','stage_execute');
add('target_prod',5270,650,780,170,'目标：图片文字模板面板','image-editor-text-template\n正式版本','panel','stage_publish');
// Two independent ingress paths; no text is outside its component.
add('item_queue',90,1090,320,160,'素材变更消息','item_change','queue','stage_event');
add('review',465,1090,580,320,'图片审核变为通过？','static_review_status\n未通过／缺失 → 通过','decision','stage_event');
add('skip_review',600,1470,360,120,'不创建同步任务','','end','stage_event');
add('condition',1240,1090,660,340,'转静完成且已上线？','biz_extra.\nstatic_preview_time\n存在，且素材已上线','decision','stage_plan');
add('skip_condition',1370,1470,350,120,'不创建同步任务','','end','stage_plan');
add('match_static',1980,1090,320,150,'匹配来源、目标分类','','action','stage_plan');
add('create_static',2390,1090,500,170,'创建动转静同步任务','记录该模板要加入的图片分类','action','stage_plan');
add('panel_queue',90,1780,320,160,'面板发布消息','panel_publish','queue','stage_event');
add('panel_handler',490,1780,480,150,'转发来源面板发布事件','','action','stage_event');
add('match_panel',1260,1780,410,150,'匹配来源、目标分类','','action','stage_plan');
add('diff',1790,1780,420,170,'计算分类变更','过滤候选新增素材','action','stage_plan');
add('create_panel',2350,1780,540,170,'创建面板同步任务','记录本次来源版本的分类变更','action','stage_plan');
// Horizontal shared main line: the task tables are supporting data above it.
add('task_table',3190,930,450,185,'同步任务表','distribute_record','store','stage_execute');
add('consume',3185,1300,320,155,'执行同步任务','','action','stage_execute');
add('write',3640,1300,480,170,'更新图片文字模板面板','内测内容 · Draft','action','stage_execute');
add('draft_table',3720,930,485,185,'目标内测内容表','client_scene_content_draft','store','stage_execute');
add('register',4400,1300,330,150,'登记发布任务','','action','stage_publish');
add('merge',4850,1300,330,150,'合并同面板发布需求','','action','stage_publish');
add('publish',5300,1300,400,170,'发布图片文字模板面板','正式版本','action','stage_publish');
add('result',5820,1300,440,185,'图片文字模板面板','正式版本可用','end','stage_publish');
add('publish_table',4510,930,500,185,'发布任务表','publish_task','store','stage_publish');
add('prod_table',5300,930,760,185,'正式版本内容表','client_scene_content','store','stage_publish');
// Native FaaS platform cards, with service names in the cards, not hanging captions.
add('timer_consume',3290,1940,850,185,'同步任务定时调度 FaaS','ies.vimo.material_event_consume\nautoDistributeTask','platform','stage_execute');
add('timer_publish',4560,1940,850,185,'发布任务定时调度 FaaS','ies.vimo.material_event_consume\npublishTask','platform','stage_publish');
// Business connectors, completely separate from data corridors.
link('item_event','item_queue','review');link('review_yes','review','condition','是');link('review_no','review','skip_review','否','bottom','top');
link('condition_yes','condition','match_static','是');link('condition_no','condition','skip_condition','否','bottom','top');
link('match_create','match_static','create_static');
link('static_enqueue','create_static','task_table','写入','right','left',false,[{x:3040,y:1090},{x:3040,y:930}]);
link('panel_event','panel_queue','panel_handler');link('panel_request','panel_handler','match_panel');link('panel_diff','match_panel','diff');link('panel_create','diff','create_panel');
link('panel_enqueue','create_panel','task_table','写入','right','left',false,[{x:3008,y:1780},{x:3008,y:981.8}],{ep:.78,pos:.8});
link('read_task','task_table','consume','读取','bottom','top',true,[{x:3415,y:1160},{x:3345,y:1160}]);
link('main_write','consume','write');link('main_register','write','register','成功');link('register_write','register','publish_table','写入','top','bottom',true,[{x:4565,y:1110},{x:4760,y:1110}]);
link('publish_read','publish_table','merge','读取','bottom','top',true,[{x:4760,y:1140},{x:5015,y:1140}],{pos:.55});
link('main_register_merge','register','merge');link('main_publish','merge','publish');link('main_result','publish','result');
// Data objects: source state differs by trigger but both use the same source/target mapping.
link('source_static','source_panel','match_static','读取','bottom','top',true,[{x:1515,y:820},{x:2140,y:820}]);
link('config_static','config','match_static','读取','bottom','top',true,[{x:2435,y:870},{x:2204,y:870}],{ep:.7});
link('source_panel_diff','source_panel','diff','读取','left','top',true,[{x:1130,y:650},{x:1130,y:1610},{x:2000,y:1610}],{pos:.75});
link('config_panel','config','match_panel','读取','left','top',true,[{x:1888,y:650},{x:1888,y:780},{x:1210,y:780},{x:1210,y:1640},{x:1465,y:1640}],{pos:.86});
link('write_draft','write','draft_table','写入','top','bottom',true,[{x:3880,y:1120},{x:3962.5,y:1120}]);
link('draft_context','draft_table','target_draft','','top','bottom',true,null,{noArrow:true});
link('write_prod','publish','prod_table','写入','top','bottom',true,[{x:5500,y:1110},{x:5680,y:1110}]);
link('prod_context','prod_table','target_prod','','top','bottom',true,null,{noArrow:true});
link('timer_call_consume','timer_consume','consume','定时调用','top','bottom',true,[{x:3715,y:1880},{x:3535,y:1880},{x:3535,y:1520},{x:3345,y:1520}]);
link('timer_call_publish','timer_publish','merge','定时调用','top','bottom',true,[{x:4985,y:1770},{x:5015,y:1770}]);
// Persist semantic blueprint separately from the converter protocol.
const doc={version:2,nodes:[...ns,...es]};
fs.writeFileSync(path.join(dir,'board.json'),JSON.stringify(doc,null,2));
fs.writeFileSync(path.join(dir,'design.json'),JSON.stringify({W,H,sections,specs,routes},null,2));
console.log(JSON.stringify({W,H,nodes:ns.length,connectors:es.length,topology:'two ingress, horizontal shared execution'}));
