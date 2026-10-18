const fs=require('fs');
const out=process.argv[2];
// Horizontal stages and system lanes are retained from the live board.
const F={title:40,heading:28,body:26,detail:22};
const C={ink:'#1F2329',muted:'#4E5969',line:'#798390',grid:'#DCE1E8',white:'#FFFFFF',stage:'#556376'};
const P=[['vimo','VIMO 业务任务','PSM\nies.vimo.material_web','#436299','#F4F6FA'],['bpm','BPM 审批与编排','流程 key\nvimo_material_transfer','#644E9F','#F7F5FB'],['material','素材服务','PSM\nfaceu.artist.op_server\nfaceu.artist.feed','#467175','#F4F8F8'],['target','目标业务','PSM\nies.vimo.material_web\n（目标站点）','#4B7E5A','#F4F8F5']];
const L=390,NW=276,NH=126,PITCH=354,X=i=>L+i*PITCH,Y=[250,510,770,1030],CENTER=r=>Y[r]+100;
const MAIN_RIGHT=X(6)+NW+42, STORE_X=MAIN_RIGHT+74,STORE_W=400,W=STORE_X+STORE_W+30;
const nodes=[],edges=[],boxes={};
const txt=(id,x,y,w,s,size=F.body,bold=false,color=C.ink)=>({type:'text',id,x,y,width:w,height:'fit-content',text:s,fontSize:size,textColor:color,textAlign:'center',...(bold?{text:[{content:s,bold:true,fontSize:size,color}]}:{})});
const rect=(id,x,y,w,h,s,fill,border,size=F.body)=>{boxes[id]={x,y,w,h};return {type:'rect',id,x,y,width:w,height:h,text:s,fontSize:size,textColor:C.ink,textAlign:'center',verticalAlign:'middle',fillColor:fill,borderColor:border,borderWidth:2,borderRadius:12};};
nodes.push(txt('title',30,28,W-60,'素材搬运系统全景',F.title,true));
['1  申请预检','2  提交审批','3  准备执行','4  创建搬运','5  查询结果','6  后续处理','7  汇总通知'].forEach((s,i)=>nodes.push(rect('stage_'+i,X(i),138,NW,62,s,'#F1F3F5',C.stage,F.detail)));
nodes.push(txt('storage_heading',STORE_X,156,STORE_W,'存储',F.heading,true));
P.forEach(([id,name,sub,dark,fill],r)=>{
 nodes.push({type:'frame',id:id+'_lane',x:30,y:Y[r],width:MAIN_RIGHT-30,height:200,layout:'none',gap:0,padding:0,fillColor:fill,borderColor:C.grid,borderWidth:1,borderRadius:14,children:[]});
 boxes[id+'_lane']={x:30,y:Y[r],w:MAIN_RIGHT-30,h:200};
 nodes.push({type:'frame',id:id+'_header',x:48,y:Y[r]+8,width:316,height:184,layout:'vertical',gap:8,padding:[14,12],alignItems:'center',justifyContent:'center',fillColor:C.white,borderColor:dark,borderWidth:2,borderRadius:12,children:[txt(id+'_name',0,0,292,name,F.heading,true),txt(id+'_psm',0,0,292,sub,F.detail,false,C.muted)]});
});
const step=(id,col,r,s)=>nodes.push(rect(id,X(col),CENTER(r)-NH/2,NW,NH,s,C.white,P[r][3]));
step('v_apply',0,0,'发起申请\n执行双层预检');step('v_freeze',1,0,'固定通过素材\n创建业务任务');step('v_merge',4,0,'合并逐素材结果\n保留失败原因');step('v_summary',6,0,'汇总任务详情\n搬运与后续操作分开');
step('b_approve',1,1,'来源业务审批');step('b_field',2,1,'准备目标字段');step('b_create',3,1,'触发搬运创建');step('b_query',4,1,'轮询执行结果');step('b_post',5,1,'触发后续处理');step('b_notify',6,1,'通知申请人');
step('m_check',0,2,'校验归属、版权\n与搬运关系');step('m_execute',3,2,'复制素材\n维护血缘关系');step('m_result',4,2,'返回逐素材状态\n与目标素材 ID');
step('t_field',2,3,'创建或复用\n目标业务字段');step('t_post',5,3,'替换旧引用\n加入面板 · 创建测试');step('t_result',6,3,'返回后续操作结果');
const link=(id,a,b,label='',opt={})=>edges.push({type:'connector',id,connector:{from:a,to:b,fromAnchor:opt.fa||'right',toAnchor:opt.ta||'left',lineShape:opt.points?'polyline':'straight',lineColor:C.line,lineWidth:opt.dash?2:3,lineStyle:opt.dash?'dashed':'solid',startArrow:opt.both?'triangle':'none',endArrow:opt.dash?'none':'triangle',...(label?{label,labelPosition:opt.pos??.5}:{}),...(opt.points?{waypoints:opt.points}:{})}});
// Clear horizontal main links; requests and returned results remain bound to actual nodes.
link('e1','v_apply','m_check','',{fa:'bottom',ta:'top',both:true});
link('e2','v_apply','v_freeze','通过项');
link('e3','v_freeze','b_approve','taskId',{fa:'bottom',ta:'top'});
link('e4','b_approve','b_field');link('e6','b_field','b_create');link('e8','b_create','b_query');
link('e5','b_field','t_field','',{fa:'bottom',ta:'top',both:true});
link('e7','b_create','m_execute','',{fa:'bottom',ta:'top',both:true});
link('e9','b_query','m_result','',{fa:'bottom',ta:'top',both:true});
// Result-return routes use column gaps, never the interior of a step card.
const qroute=X(4)-39;
link('e10','m_result','v_merge','逐素材结果',{fa:'left',ta:'left',pos:.46,points:[{x:qroute,y:CENTER(2)},{x:qroute,y:CENTER(0)}]});
link('e11','v_merge','b_post','成功素材',{fa:'bottom',ta:'top',pos:.82,points:[{x:X(4)+NW/2,y:480},{x:X(5)+NW/2,y:480}]});
link('e12','b_post','t_post','目标素材 ID',{fa:'bottom',ta:'top'});
link('e13','t_post','t_result');
const rr=X(6)+NW+24;
link('e14','t_result','v_summary','后续操作结果',{fa:'right',ta:'right',pos:.39,points:[{x:rr,y:CENTER(3)},{x:rr,y:CENTER(0)}]});
link('e15','v_summary','b_notify','',{fa:'bottom',ta:'top'});
// Storage uses lane-level association: avoids suggesting one step is the only writer.
const stores=[['db_vimo',0,'material_transfer_task\n申请快照 · 逐素材结果\n后续步骤'],['db_bpm',1,'BPM 流程记录\n审批实例 · 节点进度'],['db_material',2,'material_transfer_execution\n受理 · 执行结果\n目标素材 ID']];
stores.forEach(([id,r,s])=>{nodes.push({type:'cylinder',id,x:STORE_X,y:CENTER(r)-88,width:STORE_W,height:176,text:s,fontSize:F.detail,textColor:C.ink,textAlign:'center',verticalAlign:'middle',fillColor:P[r][4],borderColor:P[r][3],borderWidth:2});link('d_'+id,P[r][0]+'_lane',id,'',{dash:true});});
nodes.push(txt('legend',390,1278,W-450,'实线：执行与调用    虚线：该系统保存的信息',F.detail,false,C.muted));
fs.writeFileSync(out,JSON.stringify({version:2,nodes:[...nodes,...edges]},null,2));
console.log('生成',out,'尺寸',W,1340);
