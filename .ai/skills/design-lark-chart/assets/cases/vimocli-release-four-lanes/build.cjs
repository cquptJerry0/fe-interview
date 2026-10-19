const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const C={ink:'#1f2329',line:'#738092',muted:'#5e6672',blue:'#5b7fcb',teal:'#168b91',green:'#509863',white:'#ffffff',action:'#f0f4fc',yellow:'#fef1ce',violet:'#eae2fe',sub:'#eff9f8',rule:'#dee0e3'};
const G={margin:40,laneLabel:220,pad:32,step:80,stageGap:144,font:30,detail:28,top:300,bottom:2220,upper:1110,lower:1380,platform:1690,credential:2060};
const rows=[{id:'detail',title:'1\n细节展开',top:420,bottom:940},{id:'main',title:'2\n主流程',top:980,bottom:1510},{id:'platform',title:'3\n平台',top:1550,bottom:1880},{id:'auth',title:'4\n认证',top:1920,bottom:2220}];
const prep=[['merge','开发者：\n将功能 MR\n合入 main',240,'person'],['calculate','编排 CI：\n计算下一个\n正式版本号',270],['release','编排 CI：\n创建或更新\n版本 MR',270],['merge-release','编排 CI：\n检查通过后\n自动合入 MR',270],['tag','编排 CI：\n创建版本 Tag\nv0.2.78\n（示例）',280,'file']];
const artifact=[['package-check','制品 CI：\n检查代码\n构建 npm 包',280],['npm','制品 CI：\n发布 npm 包\n@byted/vimocli',280],['skill','制品 CI：\n发布变更 Skill\n到 AgentBuddy',300],['mark','制品 CI：\n登记本次\n包与 Skill 已发布',280]];
const sandbox=[['wait','沙箱 CI：\n等待本次包与\nSkill 发布成功',270],['download','区域 Runner：\n下载本次\n精确版本 npm 包',270],['template-check','沙箱 CI：\n确认模板已有\n构建成功',260],['instance-check','沙箱 CI：\n确认实例没有\n正在进行的发布',280],['patch','沙箱 CI：\n更新模板内的\nnpm 安装版本',270],['build','模板平台：\n构建镜像\n返回镜像版本',260],['deploy','沙箱 CI：\n使用本次镜像\n部署实例',260],['verify','沙箱 CI：\n回读实例\n核对版本与状态',280]];
const widthOf=list=>list.reduce((s,n)=>s+n[2],0)+(list.length-1)*G.step+2*G.pad;
const widths=[widthOf(prep),widthOf(artifact),widthOf(sandbox),480];
const areas=widths.map((width,i)=>({x:G.margin+G.laneLabel+widths.slice(0,i).reduce((s,w)=>s+w+G.stageGap,0),width}));
const [p,a,s,r]=areas,W=r.x+r.width+G.margin;
const nodes=[],edges=[],specs={},loc={};
function txt(id,text,x,y,width,size=G.font,color=C.ink){nodes.push({id,type:'text',text,x,y,width,height:'fit-content',fontSize:size,textColor:color,textAlign:'left'});}
function frame(id,x,y,width,height,fill=C.sub,dash=true){nodes.push({id,type:'frame',x,y,width,height,layout:'none',gap:0,padding:0,children:[],fillColor:fill,borderColor:dash?C.line:fill,borderWidth:dash?1:0,borderDash:dash?'dashed':'solid',borderRadius:8});}
function box(id,text,x,cy,width,kind='action',font=G.font,lane='main'){
 const type={store:'cylinder',decision:'diamond'}[kind]??'rect';
 const fill={person:C.violet,file:C.violet,store:C.violet,decision:C.yellow,credential:C.yellow,platform:C.white,runner:C.white}[kind]??C.action;
 nodes.push({id,type,text,x,y:cy-60,width,height:'fit-content',fontSize:font,textColor:C.ink,textAlign:'center',fillColor:fill,borderColor:C.ink,borderWidth:1,borderRadius:4});
 specs[id]={kind,cy,x,width,text,lane,font};return id;
}
function edge(id,from,to,label='',kind='sequence',opts={}){edges.push({id,type:'connector',connector:{from,to,fromAnchor:kind==='sequence'?'right':'bottom',toAnchor:kind==='sequence'?'left':'top',lineShape:'straight',lineStyle:kind==='sequence'?'solid':'dashed',lineColor:C.line,lineWidth:1,startArrow:'none',endArrow:kind==='sequence'?'arrow':'none',...(label?{label}:{}),...opts}});}
function chain(area,list,cy){let x=area.x+G.pad;list.forEach(([id,text,width,kind='action'],i)=>{box(id,text,x,cy,width,kind);loc[id]={x,width,center:x+width/2};if(i)edge('main-'+id,list[i-1][0],id);x+=width+G.step;});}
function subchain(id,title,x,width,items,target){const y=510,h=300,pad=24,gap=60,nw=(width-pad*2-gap*(items.length-1))/items.length;frame(id,x,y,width,h);txt(id+'-title',title,x+pad,y+20,width-2*pad,28,C.muted);items.forEach((t,i)=>{box(id+'-'+i,t,x+pad+i*(nw+gap),y+182,nw,'action',G.detail,'detail');if(i)edge(id+'-e'+i,id+'-'+(i-1),id+'-'+i);});edge(id+'-detail',id,target,'展开','dependency');}
const titles=['发布准备','包与 Skill 发布','沙箱发布','交付结果'];
const colors=[C.blue,C.teal,C.green,C.muted],fills=['#eef3ff','#eff9f8','#f0f8f1','#f5f6f8'];
areas.forEach((area,i)=>{frame('area'+i,area.x,G.top,area.width,G.bottom-G.top,fills[i],false);txt('heading'+i,titles[i],area.x+G.pad,G.top+24,area.width-2*G.pad,40,colors[i]);});
rows.forEach(row=>{frame('lane-label-'+row.id,G.margin,row.top,G.laneLabel-40,row.bottom-row.top,'#f5f6f8',false);txt('lane-name-'+row.id,row.title,G.margin+28,(row.top+row.bottom)/2-48,G.laneLabel-68,36,C.muted);});
for(let i=0;i<rows.length-1;i++){const y=(rows[i].bottom+rows[i+1].top)/2;nodes.push({id:'separator'+i,type:'rect',x:G.margin,y,width:W-2*G.margin,height:2,fillColor:C.rule,borderWidth:0});}
txt('title','vimocli 自动发布：执行步骤、平台与身份',G.margin,24,W-2*G.margin,48);
txt('subtitle','横向看执行顺序，纵向看细节与依赖；同一 Tag 启动两个任务，沙箱先等待包与 Skill 发布成功。',G.margin,98,W-2*G.margin,30,C.muted);
const legend=[['人工 / 起止','person'],['CI 步骤','action'],['判断','decision'],['子步骤组','group'],['平台服务','platform'],['Runner','runner'],['数据 / 制品','store'],['账号 / 凭据','credential'],['版本文件','file']];
const legendStep=(W-2*G.margin)/legend.length;
legend.forEach(([name,kind],i)=>{const x=G.margin+i*legendStep;if(kind==='group')frame('legend-shape'+i,x,186,104,64,C.sub);else box('legend-shape'+i,'',x,218,104,kind,26,'legend');txt('legend-text'+i,name,x+128,195,legendStep-140,30);});
chain(p,prep,G.upper);chain(a,artifact,G.upper);chain(s,sandbox,G.lower);
specs.tag.cy=(G.upper+G.lower)/2;specs.tag.height=G.lower-G.upper+208;
edge('tag-artifact','tag','package-check','触发');
edge('tag-sandbox','tag','wait','同时启动沙箱任务；先等待制品结果');

subchain('version-detail','汇总正式版本，再计算下一版',p.x+G.pad,p.width-2*G.pad-260,[
 'main 的 package.json\nGit 正式版本 Tag\nbnpm 已发布版本',
 '在当前发布线\n取最高正式版本',
 '版本末位加一\n0.2.77 → 0.2.78'
],'calculate');
const half=(a.width-2*G.pad-72)/2;
subchain('npm-detail','已存在同版本：包摘要一致才复用',a.x+G.pad,half,['检查并\n构建','打包并\n计算摘要','对比摘要\n不同停止'],'npm');
subchain('skill-detail','按 Skill 目录增量发布；首次全量',a.x+G.pad+half+72,half,['对比上次\n成功发布','筛选变更\nSkill 目录','发布 Skill\n逐个回查'],'skill');
subchain('wait-detail','为什么沙箱必须等待',s.x+G.pad,loc['template-check'].x-s.x-G.pad-72,['查询本次\n发布结果','未完成就等\n失败则停止'],'wait');

const oldX=loc['template-check'].x,oldW=loc.patch.x-oldX-72;
frame('old-build-detail',oldX,480,oldW,420);txt('old-title','模板已有构建怎么处理',oldX+24,504,oldW-48,28,C.muted);
box('old-state','构建\n状态？',oldX+24,704,210,'decision',28,'detail');specs['old-state'].height=210;
const outX=oldX+334,outW=oldW-358;
[['old-ok','成功：继续',588],['old-wait','进行中：等待\n原构建结束',710],['old-fail','失败：停止\n提示人工处理',832]].forEach(([id,t,y])=>box(id,t,outX,y,outW,'action',28,'detail'));
['old-ok','old-wait','old-fail'].forEach((id,i)=>edge('old-branch'+i,'old-state',id));
edge('old-detail','old-build-detail','template-check','展开','dependency');
subchain('patch-detail','保留原配置，只更新本次包版本',loc.patch.x,s.x+s.width-G.pad-loc.patch.x,['读取模板\n原配置','固定安装版本\n加入版本校验','再读确认未变\n提交一次更新'],'patch');
txt('site-scope','cn / i18n 共用流程，各自执行、分别记录结果',s.x+G.pad,398,s.width-2*G.pad,28,C.green);

// 所有平台和数据对象在同一通道，认证对象另起一层。
box('codebase','Codebase\n代码托管平台',loc.merge.x,G.platform,300,'platform',30,'platform');
edge('codebase-use','merge','codebase','代码 / MR / Tag','dependency');
box('version-file','package.json\n版本 0.2.78\n（示例）',loc.release.x,G.platform,320,'file',28,'platform');
edge('version-files','release','version-file','更新版本','dependency');
box('artifact-lock','包与 Skill 发布占用\n一次只运行一个任务',loc['package-check'].x,G.platform,300,'store',28,'platform');
edge('artifact-lock-use','package-check','artifact-lock','取得占用权后执行','dependency');
box('bnpm','bnpm',loc.npm.x,G.platform,300,'platform',30,'platform');
edge('npm-target','npm','bnpm','发布 / 回查','dependency');
box('agentbuddy','AgentBuddy',loc.skill.x,G.platform,320,'platform',30,'platform');
edge('skill-target','skill','agentbuddy','发布 / 回查','dependency');
box('success-record','Git 发布结果\n本次包与 Skill\n均已发布',loc.wait.x,G.platform,300,'store',28,'platform');
edge('record-write','mark','success-record','成功才写入','dependency');
edge('record-read','wait','success-record','读取同一次发布结果','dependency');
box('runner','区域 Runner\n国内 / 海外',loc.download.x,G.platform,300,'runner',28,'platform');
edge('runner-use','download','runner','本区域实际下载','dependency');
box('sandbox-lock','本站发布占用\n国内、海外各一份',loc['template-check'].x,G.platform,300,'store',28,'platform');
edge('sandbox-lock-use','template-check','sandbox-lock','构建与部署期间占用','dependency');
box('instance-task','实例发布任务\n已有任务则停止',loc['instance-check'].x,G.platform,300,'store',28,'platform');
edge('instance-task-read','instance-check','instance-task','检查是否有人正在发布','dependency');
box('template-platform','模板平台',loc.patch.x,G.platform,300,'platform',30,'platform');
edge('template-use','patch','template-platform','读取 / 更新','dependency');
box('image','本次构建的\n镜像版本',loc.build.x,G.platform,280,'store',28,'platform');
edge('build-image','build','image','跟踪本次构建','dependency');
edge('image-deploy','deploy','image','使用这个版本','dependency');
box('instance','目标实例\n实际版本 / 状态',loc.verify.x,G.platform,310,'platform',28,'platform');
edge('instance-verify','verify','instance','核对本次部署','dependency');
const auth=[['actor','平台身份\nGit / MR 权限','codebase',320],['npm-token','NPM_TOKEN','bnpm',300],['skill-sa','服务账号\n换取 JWT','agentbuddy',320],['template-sa','模板账号\ncn / i18n','template-platform',300]];
for(const [id,t,target,width]of auth){const parent=specs[target];box(id,t,parent.x+(parent.width-width)/2,G.credential,width,'credential',28,'auth');edge(id+'-auth',target,id,'认证身份','dependency');}

box('package-notice','平台通知：\n包与 Skill 发布结果\n成功 / 失败',r.x+G.pad,G.upper,r.width-2*G.pad,'person',30);
box('sandbox-notice','平台通知：\n两站沙箱发布结果\n成功 / 失败',r.x+G.pad,G.lower,r.width-2*G.pad,'person',30);
edge('package-notify','mark','package-notice','制品完成即通知，不等待沙箱');
edge('sandbox-notify','verify','sandbox-notice');
const decisions={reader_question:'沿主流程能讲完发布；向上解释机制，向下说明平台与身份',chart_choice:{type:'four-lane-flow-dependencies',reason:'用户明确选择四条横向信息通道，不把通道当执行阶段'},palette:C,grid:G,areas,rows,specs,shape_rules:{action:'round_rect',person:'round_rect2',platform:'predefined_process',runner:'hexagon',credential:'parallelogram',file:'note_shape',store:'cylinder',decision:'diamond'},source:'origin/main 1e0fd15a76c8c2145f5636292c55ad2e17b984b2',preserved_user_edits:['平台名只保留 bnpm / AgentBuddy','不恢复底部影响说明框和长图例'],wording:{CAS:'同一范围只运行一个任务；先读状态，仅在状态未被他人更新时才能抢占',versions:'汇总 main 的 package.json、正式 Git Tag 和 bnpm 已发布版本，在当前发布线取最高正式版本后末位加一'},reading_questions:['版本计算读取什么','为什么不会并发重复发布','Skill 到哪里，哪些要发','两个任务如何关联','平台与凭据是否分层']};
fs.writeFileSync(path.join(root,'board.json'),JSON.stringify({version:2,nodes:[...nodes,...edges]},null,2));
fs.writeFileSync(path.join(root,'decisions.json'),JSON.stringify(decisions,null,2));
console.log(JSON.stringify({width:W,nodes:nodes.length,edges:edges.length}));
