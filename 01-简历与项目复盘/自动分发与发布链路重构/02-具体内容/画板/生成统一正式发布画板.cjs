const fs = require('fs');

const OUT = '/Users/bytedance/Projects/personal/面试/01-简历与项目复盘/自动分发与发布链路重构/02-具体内容/画板/统一正式发布画板.json';

const C = {
  text: '#1F2329', muted: '#646A73', line: '#8F959E',
  oldBg: '#F7F8FA', oldBorder: '#C9CDD4', oldFill: '#FFFFFF',
  greenBg: '#F0F8F2', green: '#4E9D69',
  blueBg: '#F0F4FC', blue: '#5178C6', blueFill: '#E8EFFC',
  purpleBg: '#F5F1FC', purple: '#8066B3', purpleFill: '#EEE8FA',
  goldBg: '#FFF8E8', gold: '#D4A94E', goldFill: '#FFF2CE',
  redBg: '#FDEBEC', red: '#D65C5C',
  orangeBg: '#FFF1E6', orange: '#E39A48',
  white: '#FFFFFF'
};

function text(id, x, y, w, value, size=18, color=C.text, align='left') {
  return { type:'text', id, x, y, width:w, height:'fit-content', text:value, fontSize:size, textColor:color, textAlign:align, verticalAlign:'middle' };
}
function rect(id, x, y, w, h, value, fill, border, size=17, radius=10, color=C.text) {
  return { type:'rect', id, x, y, width:w, height:h, text:value, fontSize:size, textColor:color, textAlign:'center', verticalAlign:'middle', fillColor:fill, borderColor:border, borderWidth:2, borderRadius:radius };
}
function frame(id, x, y, w, h, fill, border, dash='solid', radius=16) {
  return { type:'frame', id, x, y, width:w, height:h, layout:'none', gap:0, padding:0, fillColor:fill, borderColor:border, borderWidth:2, borderDash:dash, borderRadius:radius, children:[] };
}
function card(id, x, y, w, title, desc, fill, border, titleSize=18, descSize=14) {
  return {
    type:'frame', id, x, y, width:w, height:'fit-content', layout:'vertical', gap:7, padding:[16,18],
    alignItems:'center', fillColor:fill, borderColor:border, borderWidth:2, borderRadius:10,
    children:[
      {type:'text', id:id+'_t', width:'fill-container', height:'fit-content', text:title, fontSize:titleSize, textColor:C.text, textAlign:'center'},
      {type:'text', id:id+'_d', width:'fill-container', height:'fit-content', text:desc, fontSize:descSize, textColor:C.muted, textAlign:'center'}
    ]
  };
}
function cylinder(id, x, y, w, h, value, fill, border) {
  return { type:'cylinder', id, x, y, width:w, height:h, text:value, fontSize:17, textColor:C.text, textAlign:'center', verticalAlign:'middle', fillColor:fill, borderColor:border, borderWidth:2 };
}
function conn(id, from, to, opts={}) {
  return { type:'connector', id, connector:{
    from, to,
    fromAnchor: opts.fromAnchor || 'right', toAnchor: opts.toAnchor || 'left',
    lineShape: opts.lineShape || 'rightAngle', lineColor: opts.color || C.line, lineWidth: opts.width || 2,
    lineStyle: opts.style || 'solid', startArrow:'none', endArrow: opts.endArrow || 'arrow',
    ...(opts.waypoints ? {waypoints:opts.waypoints} : {}),
    ...(opts.label ? {label:opts.label, labelPosition:opts.labelPosition ?? 0.5} : {})
  }};
}

const nodes = [];

// Backgrounds and titles
nodes.push(frame('before_bg',60,250,2280,300,C.oldBg,C.oldBorder,'solid',16));
nodes.push(frame('source_bg',80,640,300,570,C.greenBg,C.green,'solid',16));
nodes.push(frame('content_bg',420,640,600,570,C.blueBg,C.blue,'solid',16));
nodes.push(frame('publish_bg',1060,640,1280,570,C.goldBg,C.gold,'solid',16));

nodes.push(text('title',80,36,2240,'统一正式发布：从全量扫描到按需任务',32,C.text,'center'));
nodes.push(text('subtitle',80,92,2240,'内容发生变化时直接记录发布需求，发布异常只恢复发布阶段',18,C.muted,'center'));
nodes.push(rect('change_bar',80,145,2240,64,'核心变化：全量扫描所有面板寻找变化  →  直接记录已经发生的面板变化',C.blueBg,C.blue,20,10,C.text));

nodes.push(text('before_title',90,270,600,'改造前｜两条链路分别协调发布',22,C.text,'left'));
nodes.push(text('after_title',80,585,800,'改造后｜内容更新与正式发布分阶段处理',24,C.text,'left'));
nodes.push(text('source_title',105,662,250,'内容变化来源',20,C.green,'left'));
nodes.push(text('content_title',445,662,400,'阶段一｜更新面板内容',20,C.blue,'left'));
nodes.push(text('publish_title',1085,662,500,'阶段二｜生成正式版本',20,C.gold,'left'));

// Before
nodes.push(card('old_auto',110,330,250,'自动分发','保存待发布内容',C.oldFill,C.oldBorder));
nodes.push(card('old_scan',500,330,310,'定时检查所有面板','未变化面板也会被检查',C.oldFill,C.oldBorder));
nodes.push(card('old_sync',110,440,250,'分类同步','保存待发布内容',C.oldFill,C.oldBorder));
nodes.push(card('old_coord',500,440,310,'独立协调发布','状态与恢复路径分散',C.oldFill,C.oldBorder));
nodes.push(card('old_publish',980,385,290,'生成正式版本','发现变化后执行发布',C.oldFill,C.oldBorder));
nodes.push(card('old_version',1500,385,240,'正式版本','客户端使用',C.oldFill,C.oldBorder));
nodes.push(card('old_problem1',1810,320,450,'发布等待长','少量更新也要检查全部面板',C.redBg,C.red,17,14));
nodes.push(card('old_problem2',1810,430,450,'恢复路径分散','需要分别判断从哪个阶段恢复',C.redBg,C.red,17,14));

// After source and content
nodes.push(card('auto_source',110,755,240,'自动分发','素材分类变化',C.white,C.green));
nodes.push(card('sync_source',110,925,240,'分类同步','来源面板发布',C.white,C.green));
nodes.push({type:'ellipse',id:'source_merge',x:397,y:873,width:24,height:24,fillColor:C.green,borderColor:C.green,borderWidth:1});
nodes.push(card('update_content',480,842.5,280,'计算并保存面板内容','更新目标面板的待发布内容',C.white,C.blue));
nodes.push({type:'rect',id:'pending_content',x:820,y:830,width:170,height:110,text:'待发布内容\n尚未正式生效',fontSize:17,textColor:C.text,textAlign:'center',verticalAlign:'middle',fillColor:C.blueFill,borderColor:C.blue,borderWidth:2,borderRadius:8});

// Publish core
nodes.push(cylinder('publish_task',1080,812.5,230,145,'面板发布任务\n记录面板与变化范围',C.purpleFill,C.purple));
nodes.push(card('merge_task',1370,842.5,230,'合并同一面板任务','避免重复生成版本',C.white,C.purple));
nodes.push(card('claim_task',1660,842.5,230,'领取发布任务','同一任务仅一个实例执行',C.white,C.purple));
nodes.push(card('publish_version',1950,842.5,230,'生成正式版本','读取最新待发布内容',C.white,C.gold));
nodes.push({type:'rect',id:'online_version',x:2220,y:830,width:100,height:110,text:'正式版本\n可用',fontSize:17,textColor:C.text,textAlign:'center',verticalAlign:'middle',fillColor:C.greenBg,borderColor:C.green,borderWidth:2,borderRadius:8});

// Mechanism notes
nodes.push({
  type:'frame',id:'retention_note',x:1080,y:1015,width:520,height:'fit-content',layout:'vertical',gap:8,padding:[14,18],
  alignItems:'start',fillColor:C.white,borderColor:C.purple,borderWidth:2,borderRadius:10,
  children:[
    {type:'text',id:'retention_title',width:'fill-container',height:'fit-content',text:'发布需求如何保证不丢',fontSize:17,textColor:C.text,textAlign:'left'},
    {type:'text',id:'retention_1',width:'fill-container',height:'fit-content',text:'普通分发：保存内容和登记任务一起完成',fontSize:14,textColor:C.muted,textAlign:'left'},
    {type:'text',id:'retention_2',width:'fill-container',height:'fit-content',text:'分类同步：先保存结果，登记失败时依据结果补建',fontSize:14,textColor:C.muted,textAlign:'left'}
  ]
});
nodes.push({
  type:'frame',id:'recovery_note',x:1660,y:1015,width:520,height:'fit-content',layout:'vertical',gap:8,padding:[14,18],
  alignItems:'start',fillColor:C.orangeBg,borderColor:C.orange,borderWidth:2,borderRadius:10,
  children:[
    {type:'text',id:'recovery_title',width:'fill-container',height:'fit-content',text:'发布阶段独立恢复',fontSize:17,textColor:C.text,textAlign:'left'},
    {type:'text',id:'recovery_1',width:'fill-container',height:'fit-content',text:'执行中断：重新进入待执行状态',fontSize:14,textColor:C.muted,textAlign:'left'},
    {type:'text',id:'recovery_2',width:'fill-container',height:'fit-content',text:'发布失败：保存原因，未超限时重新调度',fontSize:14,textColor:C.muted,textAlign:'left'}
  ]
});
nodes.push(text('after_conclusion',1080,1170,1100,'内容更新完成后，发布异常只恢复发布阶段，不重复修改面板内容。',16,C.muted,'center'));

// Before connectors - all orthogonal
nodes.push(conn('b_auto_scan','old_auto','old_scan',{lineShape:'straight'}));
nodes.push(conn('b_sync_coord','old_sync','old_coord',{lineShape:'straight'}));
nodes.push(conn('b_scan_publish','old_scan','old_publish',{waypoints:[{x:900,y:375},{x:900,y:430}]}));
nodes.push(conn('b_coord_publish','old_coord','old_publish',{waypoints:[{x:900,y:485},{x:900,y:430}]}));
nodes.push(conn('b_publish_version','old_publish','old_version',{lineShape:'straight'}));

// After source merge and main line
nodes.push(conn('a_auto_merge','auto_source','source_merge',{waypoints:[{x:380,y:805},{x:380,y:882}],toAnchor:'left'}));
nodes.push(conn('a_sync_merge','sync_source','source_merge',{waypoints:[{x:380,y:975},{x:380,y:882}],toAnchor:'left'}));
nodes.push(conn('a_merge_update','source_merge','update_content',{lineShape:'straight'}));
nodes.push(conn('a_update_pending','update_content','pending_content',{lineShape:'straight'}));
nodes.push(conn('a_pending_task','pending_content','publish_task',{lineShape:'straight'}));
nodes.push(conn('a_task_merge','publish_task','merge_task',{lineShape:'straight'}));
nodes.push(conn('a_merge_claim','merge_task','claim_task',{lineShape:'straight'}));
nodes.push(conn('a_claim_publish','claim_task','publish_version',{lineShape:'straight'}));
nodes.push(conn('a_publish_online','publish_version','online_version',{lineShape:'straight'}));

// Mechanism notes use spatial proximity; no extra diagonal relation lines.

const doc = {version:2,nodes};
fs.writeFileSync(OUT, JSON.stringify(doc,null,2));
console.log(OUT);
