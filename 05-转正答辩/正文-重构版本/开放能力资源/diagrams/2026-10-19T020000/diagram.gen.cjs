const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'diagram.json');
const W = 1600;
const H = 720;
const nodes = [];

function text(id, x, y, width, text, fontSize = 15, color = '#1F2329', align = 'left', weight = 'regular') {
  return {
    type: 'text', id, x, y, width, height: 'fit-content', text,
    fontSize, textColor: color, textAlign: align,
    ...(weight === 'bold' ? { bold: true } : {})
  };
}

function card(id, x, y, width, height, dashed = false) {
  return {
    type: 'rect', id, x, y, width, height,
    fillColor: dashed ? '#FFFFFF' : '#F0F4FC',
    borderColor: dashed ? '#86909C' : '#5178C6',
    borderWidth: 2,
    borderDash: dashed ? 'dashed' : 'solid',
    borderRadius: 10
  };
}

function dot(id, x, y) {
  return { type: 'ellipse', id, x: x - 8, y: y - 8, width: 16, height: 16, fillColor: '#3370FF' };
}

function conn(id, from, to, style = 'solid', width = 4, arrow = false) {
  return {
    type: 'connector', id,
    connector: {
      from: { x: from[0], y: from[1] },
      to: { x: to[0], y: to[1] },
      lineShape: 'straight',
      lineColor: style === 'dashed' ? '#86909C' : '#3370FF',
      lineWidth: width,
      lineStyle: style,
      endArrow: arrow ? 'arrow' : 'none'
    }
  };
}

const children = [];
children.push(text('title', 60, 34, 500, 'VIMO 开放能力建设路径', 30));
children.push(text('subtitle', 60, 82, 720, '从单点程序调用，逐步演进为支撑智能化运营的业务执行基础', 16, '#646A73'));
children.push(text('y-label', 20, 126, 120, '开放能力成熟度', 15, '#646A73', 'left'));
children.push(text('x-label', 1480, 646, 80, '时间', 15, '#646A73', 'right'));

// axes
children.push(conn('y-axis', [70, 610], [70, 146], 'solid', 2.5, true));
children.push(conn('x-axis', [70, 610], [1510, 610], 'solid', 3, true));

// stepped path and dots
children.push(conn('step-1-h', [165, 500], [415, 500]));
children.push(conn('step-1-v', [415, 500], [415, 420]));
children.push(conn('step-2-h', [415, 420], [690, 420]));
children.push(conn('step-2-v', [690, 420], [690, 340]));
children.push(conn('step-3-h', [690, 340], [965, 340]));
children.push(conn('step-3-v', [965, 340], [965, 260]));
children.push(conn('step-4-h', [965, 260], [1240, 260]));
children.push(conn('step-4-v', [1240, 260], [1240, 180]));
children.push(conn('step-future', [1240, 180], [1435, 180], 'dashed', 3));
[[165,500],[415,420],[690,340],[965,260],[1240,180]].forEach((p,i)=>children.push(dot('dot-'+(i+1),p[0],p[1])));

const stages = [
  {x:90,y:382,title:'开放基础能力',l1:'开放基础接口　接入统一网关',l2:'接入 JWT 身份　开通接口权限',date:'04—05 月',result:'具备程序调用基础'},
  {x:340,y:302,title:'素材操作闭环',l1:'覆盖查询能力　开放配置能力',l2:'支持关联维护　支持素材发布',date:'05—06 月',result:'查询、配置、发布形成闭环'},
  {x:590,y:222,title:'扩展接入范围',l1:'收敛站点协议　适配网络环境',l2:'兼容调用身份　分级管控权限',date:'07—08 月',result:'扩展到多环境、多业务'},
  {x:840,y:142,title:'完善交付观测',l1:'串联发布流程　分发客户端能力',l2:'同步用户 Skill　采集调用数据',date:'09 月',result:'形成持续交付与观测闭环'}
];
stages.forEach((s,i)=>{
  children.push(card('card-'+i,s.x,s.y,270,118));
  children.push(text('ct-'+i,s.x+20,s.y+22,230,s.title,20));
  children.push(text('cl1-'+i,s.x+20,s.y+58,230,s.l1,14,'#4E5969'));
  children.push(text('cl2-'+i,s.x+20,s.y+84,230,s.l2,14,'#4E5969'));
  children.push(text('date-'+i,s.x,s.y+160,270,s.date,15,'#1F2329','center','bold'));
  children.push(text('res-'+i,s.x,s.y+184,270,s.result,13,'#86909C','center'));
});
children.push(card('future-card',1115,62,320,118,true));
children.push(text('future-title',1135,84,260,'走向智能化运营',20,'#4E5969','left','bold'));
children.push(text('future-1',1135,122,280,'沉淀运营工作流　建设 Workflow Skill',14,'#4E5969'));
children.push(text('future-2',1135,148,260,'建设任务评测　评估执行结果',14,'#4E5969'));
children.push(text('future-date',1115,232,320,'10 月以后',15,'#4E5969','center','bold'));
children.push(text('future-result',1115,256,320,'运营 Agent 完整交付任务',13,'#86909C','center'));

const rootChildren = children.filter((n) => n.type !== 'connector');
const connectors = children.filter((n) => n.type === 'connector');
nodes.push({
  type: 'frame',
  layout: 'none',
  x: 0, y: 0, width: W, height: H,
  gap: 0, padding: 0,
  fillColor: '#FFFFFF',
  children: rootChildren
});
nodes.push(...connectors);

const document = { version: 2, nodes };
fs.writeFileSync(out, JSON.stringify(document, null, 2));
