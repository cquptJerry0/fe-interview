const fs=require('fs');
const out=__dirname;
const C={ink:'#1F2329',muted:'#646A73',line:'#718BAE',grid:'#D7DEE7',lane:'#F8F9FA',blue:'#F0F4FC',bb:'#5178C6',green:'#DFF5E5',gb:'#509863',red:'#FEE3E2',rb:'#D25D5A',yellow:'#FEF1CE',yb:'#D4B45B',white:'#FFFFFF'};
const W=2720,H=1850,L=320,P=384,X=i=>L+i*P,CW=328;
const nodes=[],edges=[],meta={boxes:{},edges:[],types:{},containers:[],width:W,height:H};
function txt(id,x,y,w,text,size=28,bold=false,color=C.ink){nodes.push({type:'text',id,x,y,width:w,height:'fit-content',text:bold?[{content:text,bold:true,fontSize:size,color}]:text,fontSize:size,textColor:color,textAlign:'left'});}
function box(id,x,y,w,h,text,fill=C.white,border=C.bb,size=30,type='round_rect'){
 meta.boxes[id]={x,y,w,h,text};meta.types[id]=type;
 nodes.push({type:'rect',id,x,y,width:w,height:h,text,fontSize:size,textColor:C.ink,textAlign:'center',verticalAlign:'middle',fillColor:fill,borderColor:border,borderWidth:2,borderRadius:12});
}
function lane(id,y,h,label,field=''){
 nodes.push({type:'frame',id,x:24,y,width:W-48,height:h,layout:'none',gap:0,padding:0,fillColor:C.lane,borderColor:C.grid,borderWidth:1,borderRadius:14,children:[]});meta.containers.push(id);
 txt(id+'_name',44,y+24,245,label,32,true);if(field)txt(id+'_field',44,y+70,250,field,23,false,C.muted);
}
function edge(id,a,b,label='',fa='right',ta='left',points=[],dash=false){
 edges.push({type:'connector',id:'edge_'+id,connector:{from:a,to:b,fromAnchor:fa,toAnchor:ta,lineShape:points.length?'polyline':'straight',lineColor:C.line,lineWidth:2,lineStyle:dash?'dashed':'solid',endArrow:'triangle',...(points.length?{waypoints:points}:{}),...(label?{label}: {})}});
 meta.edges.push({id,a,b,label,fa,ta,points,dash});
}
function stateEnd(id,x,y){box(id,x,y,26,26,'',C.ink,C.ink,20,'state_end');}
function stateStart(id,x,y){box(id,x,y,22,22,'',C.ink,C.ink,20,'state_start');}

// Stage alignment is spatial context, not a common clock.
txt('title',34,16,W-70,'全球素材搬运 · 分层状态',46,true);
['准备与预检','审批 / 字段准备','创建搬运','查询结果','后处理','通知 / 结束'].forEach((s,i)=>box('stage'+i,X(i),128,CW,60,s,'#EDF2F7','#8895A7',30));

lane('workflow',212,180,'流程阶段','current_step');
box('wf0',X(0),251,CW,65,'预检');
box('wf1',X(1),251,142,65,'审批');box('wf2',X(1)+186,251,142,65,'字段准备');
box('wf3',X(2),251,CW,65,'创建搬运');box('wf4',X(3),251,CW,65,'查询结果');
box('wf5',X(4),251,CW,65,'后处理');box('wf6',X(5),251,210,65,'通知');
stateEnd('wfend',X(5)+283,270);txt('wfendtext',X(5)+244,313,110,'结束',24,false,C.muted);
['wf0','wf1','wf2','wf3','wf4','wf5','wf6','wfend'].slice(0,-1).forEach((a,i)=>edge('wfedge'+i,a,['wf0','wf1','wf2','wf3','wf4','wf5','wf6','wfend'][i+1]));
// Exit route only changes workflow; it does not imply failed material.
edge('wfexit','wf1','wf6','审批拒绝、取消或编排失败：转通知收尾','bottom','bottom',[{x:X(1)+71,y:363},{x:X(5)+105,y:363}],true);

lane('precheck',412,226,'预检结果','precheck_status');
stateStart('pcstart',X(0)-30,476);
box('pc0',X(0),447,206,82,'检查中',C.blue);
box('pc1',X(1),431,230,64,'可提交',C.green,C.gb);
box('pc2',X(1),537,230,64,'未通过',C.red,C.rb);
edge('pcbegin','pcstart','pc0');
edge('pcpass','pc0','pc1','通过','right','left',[{x:X(0)+272,y:488},{x:X(0)+272,y:463}]);
edge('pcfail','pc0','pc2','未通过','bottom','left',[{x:X(0)+103,y:569}]);
edge('pcretry1','pc1','pc0','提交前重新校验','top','top',[{x:X(1)+115,y:420},{x:X(0)+103,y:420}],true);
edge('pcretry2','pc2','pc0','重新校验','bottom','bottom',[{x:X(1)+115,y:622},{x:X(0)+103,y:622}],true);
box('pcfixed',X(2),457,P*3+CW,78,'提交后固定本轮预检结果',C.white,'#8895A7',30);
edge('pcfreeze','pc1','pcfixed','提交','right','left',[{x:X(2)-28,y:463},{x:X(2)-28,y:496}]);

lane('material',660,378,'逐素材结果','受理 / 执行');
box('itemidle',X(0),712,P+CW,78,'尚未发起搬运',C.white,'#8895A7',30);
box('itempending',X(2),714,280,82,'受理待确认',C.yellow,C.yb);
box('itemprocessing',X(3),714,240,82,'已受理 · 复制中',C.blue);
box('itemsuccess',X(4)+26,683,260,92,'复制成功\n目标素材 ID',C.green,C.gb);
box('itemfailed',X(4)+26,843,260,92,'复制失败\n失败原因',C.red,C.rb);
box('itemreject',X(3),893,240,92,'受理拒绝\n拒绝原因',C.red,C.rb);
stateEnd('itemend1',X(4)+317,716);stateEnd('itemend2',X(4)+317,876);stateEnd('itemend3',X(3)+269,926);
edge('itemsubmit','itemidle','itempending');
edge('itemaccept','itempending','itemprocessing','确认受理');
edge('itemsuccess','itemprocessing','itemsuccess','成功','right','left',[{x:X(4)-34,y:755},{x:X(4)-34,y:729}]);
edge('itemfailed','itemprocessing','itemfailed','明确失败','bottom','left',[{x:X(3)+120,y:861},{x:X(4)-34,y:861},{x:X(4)-34,y:889}]);
edge('itemreject','itempending','itemreject','明确拒绝','bottom','left',[{x:X(2)+140,y:939}]);
edge('isend','itemsuccess','itemend1');edge('ifend','itemfailed','itemend2');edge('irend','itemreject','itemend3');
edge('itempoll','itemprocessing','itemprocessing','查询仍在执行 / 缺项','top','top',[{x:X(3)+120,y:686},{x:X(3)+198,y:686}],true);
box('itemkeep',X(5),772,CW,118,'已确认终态保持\n未结束项仍可回查',C.white,'#8895A7',28);
txt('itemscope',X(0),999,W-L-60,'受理待确认不是失败；成功 / 失败确认后，迟到响应不改写结果。',26,false,C.muted);

lane('aggregate',1060,168,'整批复制结果','transfer_status');
box('ag0',X(0),1113,P+CW,64,'未开始',C.white,'#8895A7');
box('ag1',X(2),1113,P+240,64,'处理中',C.blue);
box('agend',X(4),1092,P+CW,109,'无复制中项：全部成功 / 部分成功 / 失败\n仍有复制中项：继续保持处理中',C.white,'#8895A7',28);
edge('agbegin','ag0','ag1');edge('agresult','ag1','agend');

lane('polling',1250,205,'查询等待','polling_status');
box('pollwait',X(3),1280,240,68,'等待中',C.blue);
box('pollcomplete',X(4),1268,205,65,'完成',C.green,C.gb);
box('polltimeout',X(4),1371,205,65,'超时',C.yellow,C.yb);
edge('pollcomp','pollwait','pollcomplete','无复制中项','right','left',[{x:X(4)-46,y:1314},{x:X(4)-46,y:1300}]);
edge('polltimeout','pollwait','polltimeout','到期仍有复制中项','bottom','left',[{x:X(3)+120,y:1403}]);
box('pollkeep',X(5),1304,CW,104,'流程可结束\n素材结果继续保留',C.white,'#8895A7',28);

lane('post',1477,310,'后处理结果','step_results');
const startX=X(3)-90,finalX=X(4)-42,bw=144,bgap=22;
for(const [i,label] of ['加入面板','创建测试任务'].entries()){
 const yy=1511+i*128;box('postidle'+i,startX,yy,210,88,label+'\n未执行',C.white,'#8895A7',27);
 const terminalLabels=['成功','部分失败','失败','跳过'];
 terminalLabels.forEach((t,j)=>{const fill=[C.green,C.yellow,C.red,'#F0F0F0'][j],border=[C.gb,C.yb,C.rb,'#8895A7'][j];box('post'+i+'_'+j,finalX+j*(bw+bgap),yy+10,bw,68,t,fill,border,27);});
 // One branching trunk per operation; no fork/join between operations.
 const id='postout'+i;edge(id,'postidle'+i,'post'+i+'_0','结果分别记录');
 for(let j=1;j<4;j++)edge('postout'+i+'_'+j,'postidle'+i,'post'+i+'_'+j,'','bottom','bottom',[{x:startX+105,y:yy+113},{x:finalX+j*(bw+bgap)+bw/2,y:yy+113}]);
}
txt('postinput',X(0),1510,680,'输入：复制成功且有目标 ID 的素材',28,true);
txt('postskip',X(0),1553,680,'跳过：未选择 / 无成功素材',26,false,C.muted);
txt('postnote',X(0),1618,680,'创建测试任务成功 ≠ 测试通过',26,false,C.muted);
txt('postprotect',X(0),1665,680,'后处理失败不覆盖复制结果',26,true);

fs.writeFileSync(out+'/分层状态图.json',JSON.stringify({version:2,nodes:[...nodes,...edges]},null,2));
fs.writeFileSync(out+'/布局与语义.json',JSON.stringify(meta,null,2));
console.log(JSON.stringify({width:W,height:H,nodes:nodes.length,edges:edges.length}));
