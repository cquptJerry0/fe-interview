const fs=require('node:fs');
const path=require('node:path');
const out=__dirname;
const num=process.argv[2];
const C={ink:'#1F2329',muted:'#646A73',line:'#718BAE',blue:'#5178C6',blueFill:'#F0F4FC',green:'#509863',greenFill:'#DFF5E5',yellow:'#D4B45B',yellowFill:'#FEF1CE',red:'#D25D5A',redFill:'#FEE3E2',gray:'#8895A7',grayFill:'#F0F0F0',white:'#FFFFFF'};
const F={title:42,section:34,body:30};
let W=1200,H=1200;const nodes=[],edges=[],specs={},routes={};
function text(id,t,x,y,w,size=F.body,color=C.ink,align='left'){
 nodes.push({type:'text',id,x,y,width:w,height:'fit-content',text:t,fontSize:size,textColor:color,textAlign:align});
 specs[id]={kind:'text',x,y,w,h:Math.ceil(t.split('\n').length*size*1.4),text:t};
}
function frame(id,x,y,w,h,fill=C.blueFill,dash=false){
 nodes.push({type:'frame',id,x,y,width:w,height:h,layout:'none',gap:0,padding:0,children:[],fillColor:fill,borderColor:dash?C.gray:fill,borderWidth:dash?1:0,borderDash:dash?'dashed':'solid',borderRadius:12});
 specs[id]={kind:'container',x,y,w,h};
}
function box(id,t,x,y,w,h=90,kind='action',color=C.blue,fill=C.white){
 const type=kind==='decision'?'diamond':kind==='store'?'cylinder':'rect';
 nodes.push({type,id,x,y,width:w,height:'fit-content',text:t,fontSize:F.body,textColor:C.ink,textAlign:'center',verticalAlign:'middle',fillColor:fill,borderColor:color,borderWidth:2,borderRadius:10});
 specs[id]={kind,x,y,w,h,text:t};
}
function edge(id,a,b,label='',fa='right',ta='left',opts={}){
 edges.push({type:'connector',id,connector:{from:a,to:b,fromAnchor:fa,toAnchor:ta,lineShape:opts.points?'polyline':'straight',lineColor:C.line,lineWidth:2,lineStyle:opts.dash?'dashed':'solid',startArrow:'none',endArrow:opts.noArrow?'none':'arrow',...(label?{label}:{}),labelPosition:opts.pos??.5,...(opts.points?{waypoints:opts.points}:{})}});
 routes[id]={...opts,fa,ta};
}
function title(t,sub){text('title',t,40,20,W-80,F.title);if(sub)text('subtitle',sub,40,82,W-80,F.body,C.muted);}
function seq(participants,w,h){
 W=w;H=h;const columns={};
 participants.forEach(([id,t,x,color,fill])=>{
  columns[id]=x;box(id+'_header',t,x-145,140,290,95,'platform',color,fill);
  box(id+'_bottom','',x-2,h-80,4,4,'pin',color);
  edge(id+'_life',id+'_header',id+'_bottom','','bottom','top',{dash:true,noArrow:true});
 });
 function pin(p,y){const id=p+'_'+y;if(!specs[id])box(id,'',columns[p]-6,y-12,12,24,'activation',C.line,C.white);return id;}
 return {
  msg(id,a,b,y,t,dash=false){const left=columns[a]<columns[b];edge(id,pin(a,y),pin(b,y),t,left?'right':'left',left?'left':'right',{dash});},
  self(id,p,y,t){const x=columns[p];edge(id,pin(p,y),pin(p,y+56),t,'right','right',{points:[{x:x+180,y},{x:x+180,y:y+56}],pos:.3});},
  note(id,t,x,y,w=600,h=65,fill=C.yellowFill){box(id,t,x,y,w,h,'action',C.yellow,fill);},
  area(id,t,y,h,fill=C.blueFill){frame(id,32,y,W-64,h,fill,true);text(id+'_name',t,48,y+12,W-96,F.section);}
 };
}

if(num==='03'){
 const q=seq([['v','VIMO 搬运服务',210,C.blue,C.blueFill],['db','任务主库',570,C.gray,C.grayFill],['op','素材执行服务',970,C.green,C.greenFill]],1200,1240);
 title('③ 执行恢复','调用前保存编号；再次处理时继续原执行');
 q.msg('save','v','db',290,'保存逐素材执行编号');q.msg('saved','db','v',345,'保存完成',true);
 q.msg('create','v','op',420,'携带编号，分批创建搬运');
 q.msg('partial','op','v',490,'逐项返回受理或拒绝',true);
 q.msg('merge','v','db',550,'合并已确认的受理结果');
 q.note('unknown','某批响应未知：该批及后续项保留“受理待确认”',130,600,940,70);
 q.area('resume','中断后，再次处理同一任务',700,420);
 q.msg('load','v','db',785,'读取原编号和受理结果');q.msg('return','db','v',840,'返回已保存的逐项记录',true);
 q.msg('resubmit','v','op',940,'受理待确认：沿用原编号重投');
 q.msg('query','v','op',1040,'已受理且执行中：查询原结果');
 text('foot','已拒绝或已完成的素材不进入上述恢复分支',60,1160,W-120,F.body,C.muted);
}
if(num==='04'){
 W=1320;H=1610;title('④ 流程、复制与后处理分开记录','流程停止等待，不等于所有素材已完成');
 frame('flow',32,140,1256,410,C.blueFill);text('flow_title','流程阶段与等待',56,156,600,F.section);
 box('create','创建搬运',80,242,225,84);box('poll','轮询等待',390,242,235,84);box('end','通知并结束',1000,242,230,84);
 edge('flow1','create','poll');edge('flow2','poll','end','等待正常结束');
 box('budget','等待超时',410,398,205,84,'action',C.yellow,C.yellowFill);edge('timeout','poll','budget','','bottom','top');edge('timeout_end','budget','end','','right','bottom',{points:[{x:1115,y:440}]});
 text('flow_note','正常完成可按需后处理；超时不把未完成素材判为失败',65,494,1170,F.body,C.muted);
 frame('items',32,590,1256,525,C.greenFill);text('items_title','每份素材的复制结果',56,608,800,F.section);
 box('pending','受理待确认',85,710,245,90,'action',C.yellow,C.yellowFill);box('running','执行中',480,710,240,90);box('ok','复制成功\n保存目标 ID',955,680,245,116,'action',C.green);
 box('fail','复制失败\n保存失败原因',955,905,245,116,'action',C.red);
 edge('accepted','pending','running','确认受理');edge('success','running','ok','明确成功','right','left',{points:[{x:840,y:755},{x:840,y:738}],pos:.5});
 edge('reject','pending','fail','明确拒绝','bottom','left',{points:[{x:207,y:1010},{x:915,y:1010},{x:915,y:967}],pos:.57});
 edge('failed','running','fail','明确失败','bottom','left',{points:[{x:600,y:967}],pos:.5});
 text('missing','查询缺项：仍保留执行中',405,833,475,F.body,C.muted);
 text('terminal','成功／失败已确认后，迟到响应不改写终态',56,1050,1160,F.body,C.muted);
 frame('post',32,1150,1256,290,C.grayFill);text('post_title','后处理结果 · 仅针对复制成功且有目标 ID 的素材',56,1170,1180,F.section);
 box('panel','加入面板\n单独记录结果',285,1270,315,110,'action',C.gray);box('test','创建测试\n单独记录结果',760,1270,315,110,'action',C.gray);
 text('post_note','面板或测试失败，不修改复制成功及目标素材 ID',65,1465,1180,F.body,C.muted);
 text('foot','结束后手动刷新未完成素材：更新结果，流程阶段保持结束',65,1530,1190,F.body,C.muted);
}
if(num==='05'){
 W=1280;H=1120;title('⑤ 素材访问控制','同一份素材事实，分别服务使用、维护和历史读取');
 frame('vimo',32,140,1216,670,C.blueFill);text('vimo_title','VIMO · 页面与 OpenAPI 进入对应业务服务',56,156,1160,F.section);
 const xs=[70,372,674,976];
 const data=[['search','搜索素材','搜索服务','过滤已替代\n旧素材'],['select','新增选材','面板写服务\n提交前校验','整批选材\n准入检查'],['edit','编辑／上下线','素材维护服务\n保存前校验','替代关系\n归属检查'],['history','历史引用读取','历史素材读取','按原 ID 读取']];
 data.forEach(([id,entry,service,rule],i)=>{
  const x=xs[i];box(id+'_entry',entry,x,240,234,84,'action',C.blue,C.white);box(id+'_svc',service,x,400,234,120,'platform',C.blue);
  edge(id+'_into',id+'_entry',id+'_svc','','bottom','top');
  box(id+'_rule',rule,x,620,234,100,'action',i===3?C.gray:C.green,i===3?C.grayFill:C.white);
  edge(id+'_rule_use',id+'_svc',id+'_rule','','bottom','top');
 });
 frame('rules',48,555,906,225,C.greenFill,true);text('rules_title','共用规则',310,562,170,F.body);
 frame('feed',32,855,1216,205,C.grayFill);text('feed_title','Feed · 当前业务下的素材事实',56,873,1100,F.section);
 box('owner','归属业务\n谁能维护',210,936,340,115,'action',C.gray);box('redirect','替代素材关系\n旧素材能否新增使用',720,936,390,115,'action',C.gray);
 edge('read_owner','edit_rule','owner','','bottom','top',{dash:true,noArrow:true,points:[{x:791,y:833},{x:380,y:833}]});
 edge('read_redirect','select_rule','redirect','','bottom','top',{dash:true,noArrow:true,points:[{x:489,y:820},{x:915,y:820}]});
 text('foot','虚线：规则所需事实；前端提示不代替服务端写前校验',56,1080,1160,F.body,C.muted);H=1150;
}
if(num==='06'){
 const q=seq([['ui','操作界面',185,C.blue,C.blueFill],['v','归属确认服务',560,C.blue,C.blueFill],['feed','Feed 素材服务',995,C.green,C.greenFill]],1280,1540);
 title('⑥ 补齐历史素材归属','只补空归属，保护其他人已经确认的结果');
 q.msg('submit','ui','v',290,'提交素材与候选归属业务');
 q.self('candidate','v',340,'校验同区候选');
 q.msg('read','v','feed',450,'重读归属与更新时间');q.msg('snapshot','feed','v',515,'返回最新素材快照',true);
 q.area('same','已有归属与本次选择相同',575,140,C.greenFill);q.msg('same_ok','v','ui',670,'确认成功，不重复写入',true);
 q.area('different','已有归属与本次选择不同',750,140,C.yellowFill);q.msg('different_stop','v','ui',845,'拒绝覆盖，提示已有归属',true);
 q.area('empty','归属仍为空，且有更新时间',925,340,C.blueFill);
 q.msg('write','v','feed',1020,'携带同一快照更新时间写归属');q.msg('write_result','feed','v',1100,'成功／并发变化导致写入失败',true);q.msg('item_result','v','ui',1190,'返回该素材确认结果',true);
 q.note('batch','批量逐项处理：成功项完成，失败项保留供重试',100,1310,1080,70,C.grayFill);
 text('foot','无更新时间或读取失败：停止写入；确认后由用户重提原操作',60,1440,1160,F.body,C.muted);
}
if(num==='07'){
 const q=seq([['v','引用替换服务',210,C.blue,C.blueFill],['db','任务／面板数据库',660,C.gray,C.grayFill],['pub','构建与发布服务',1160,C.green,C.greenFill]],1420,1950);
 title('⑦ 替换已有面板引用','只更新指定引用，不把其他草稿编辑一起发布');
 q.note('scope','前提：已确认面板范围，并取得成功搬运的旧 → 新素材映射',65,250,1290,70,C.grayFill);
 q.msg('read','v','db',385,'读取草稿、正式版及确认记录');q.msg('panel','db','v',455,'返回最新内容与指纹',true);
 q.self('verify','v',510,'核对确认后未变化');
 q.area('tx','同一事务：内容变化则不提交替换',635,205,C.blueFill);
 q.msg('replace','v','db',730,'替换草稿引用＋操作记录＋回执');q.msg('tx_ok','db','v',795,'事务提交完成',true);
 q.msg('build','v','pub',925,'构建并更新内测快照');q.msg('build_ok','pub','v',990,'快照已更新',true);
 q.area('draft_only','只有草稿引用：完成替换，不发正式版',1045,110,C.grayFill);
 q.area('prod','正式版也有旧引用：只发布替换差异',1190,400,C.greenFill);
 q.msg('diff','v','pub',1285,'选择替换差异并试合并');q.msg('merged','pub','v',1355,'返回试合并后的完整内容',true);
 q.self('compare','v',1410,'等于原正式版仅替换引用？');
 q.msg('mark_unknown','v','db',1515,'可分离：先记录发布待确认');
 q.msg('publish','v','pub',1625,'按既有发布规则提交所选差异');
 q.msg('reread','v','db',1700,'回读实际版本／审批结果');q.msg('actual','db','v',1765,'记录成功、待审批或待确认',true);
 text('stop','差异无法分离：保留草稿，停止自动发布',60,1820,1300,F.body,C.muted);
 text('foot','发布响应未知先回读，不盲目重发；草稿是未发布编辑，正式版供客户端使用',60,1880,1300,F.body,C.muted);
}
if(!['03','04','05','06','07'].includes(num))throw Error('未知图号');
fs.writeFileSync(path.join(out,num+'.json'),JSON.stringify({version:2,nodes:[...nodes,...edges]},null,2));
fs.writeFileSync(path.join(out,num+'-设计.json'),JSON.stringify({W,H,specs,routes,sourceCommit:'9d157f466590a5e8678956f76c6ba0e7169bef80'},null,2));
console.log(JSON.stringify({num,W,H,nodes:nodes.length,edges:edges.length}));
