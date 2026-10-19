const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'diagram.json');
const W = 1640;
const H = 760;
const nodes = [];
const children = [];

function text(id, x, y, width, value, fontSize = 15, color = '#1F2329', align = 'left') {
  return { type: 'text', id, x, y, width, height: 'fit-content', text: value, fontSize, textColor: color, textAlign: align };
}
function rect(id, x, y, width, height, dashed = false) {
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
function line(id, a, b, dashed = false, width = 4, arrow = false) {
  return {
    type: 'connector', id,
    connector: {
      from: { x: a[0], y: a[1] }, to: { x: b[0], y: b[1] },
      lineShape: 'straight', lineColor: dashed ? '#86909C' : '#3370FF',
      lineWidth: width, lineStyle: dashed ? 'dashed' : 'solid', endArrow: arrow ? 'arrow' : 'none'
    }
  };
}

children.push(text('title', 60, 34, 500, 'VIMO 开放能力建设路径', 30));
children.push(text('subtitle', 60, 82, 720, '从单点程序调用，逐步演进为支撑智能化运营的业务执行基础', 16, '#646A73'));
children.push(text('y-label', 20, 126, 120, '开放能力成熟度', 15, '#646A73'));
children.push(text('x-label', 1520, 686, 80, '时间', 15, '#646A73', 'right'));
children.push(line('y-axis', [70, 650], [70, 146], false, 2.5, true));
children.push(line('x-axis', [70, 650], [1550, 650], false, 3, true));

// Steps occupy distinct horizontal lanes. Cards sit above their horizontal connector.
const stages = [
  { x: 90,  cx: 225, labelX: 90,  lineY: 540, cardY: 360, title: '开放基础能力', l1: '开放基础接口　接入统一网关', l2: '接入 JWT 身份　开通接口权限', date: '04—05 月', result: '具备程序调用基础' },
  { x: 400, cx: 535, labelX: 245, lineY: 480, cardY: 300, title: '素材操作闭环', l1: '覆盖查询能力　开放配置能力', l2: '支持关联维护　支持素材发布', date: '05—06 月', result: '查询、配置、发布形成闭环' },
  { x: 710, cx: 845, labelX: 555, lineY: 420, cardY: 240, title: '扩展接入范围', l1: '收敛站点协议　适配网络环境', l2: '兼容调用身份　分级管控权限', date: '07—08 月', result: '扩展到多环境、多业务' },
  { x: 1020, cx: 1155, labelX: 865, lineY: 360, cardY: 180, title: '完善交付观测', l1: '串联发布流程　分发客户端能力', l2: '同步用户 Skill　采集调用数据', date: '09 月', result: '形成持续交付与观测闭环' }
];

for (let i = 0; i < stages.length; i++) {
  const s = stages[i];
  children.push(rect('card-' + i, s.x, s.cardY, 270, 118));
  children.push(text('title-' + i, s.x + 20, s.cardY + 22, 230, s.title, 20));
  children.push(text('line1-' + i, s.x + 20, s.cardY + 58, 230, s.l1, 14, '#4E5969'));
  children.push(text('line2-' + i, s.x + 20, s.cardY + 84, 230, s.l2, 14, '#4E5969'));
  children.push(text('date-' + i, s.labelX, s.lineY + 34, 270, s.date, 15, '#1F2329', 'center'));
  children.push(text('result-' + i, s.labelX, s.lineY + 58, 270, s.result, 13, '#86909C', 'center'));
  children.push(dot('dot-' + i, s.cx, s.lineY));
}

// Horizontal step lines connect adjacent stages without entering any card;
// vertical risers sit in the gaps between adjacent cards.
for (let i = 0; i < stages.length - 1; i++) {
  const a = stages[i], b = stages[i + 1];
  children.push(line('step-h-' + i, [a.cx + 8, a.lineY], [b.cx - 8, a.lineY]));
  children.push(line('step-v-' + i, [b.cx, a.lineY], [b.cx, b.lineY]));
}
children.push(line('future-h', [stages[3].cx + 8, stages[3].lineY], [1465, stages[3].lineY], true, 3));
children.push(dot('future-dot', 1465, stages[3].lineY));
children.push(rect('future-card', 1290, 180, 290, 118, true));
children.push(text('future-title', 1310, 202, 250, '走向智能化运营', 20, '#4E5969'));
children.push(text('future-1', 1310, 238, 250, '沉淀运营工作流', 14, '#4E5969'));
children.push(text('future-2', 1310, 264, 250, '建设 Workflow Skill 与任务评测', 14, '#4E5969'));
children.push(text('future-date', 1290, 394, 290, '10 月以后', 15, '#4E5969', 'center'));
children.push(text('future-result', 1290, 418, 290, '运营 Agent 完整交付任务', 13, '#86909C', 'center'));

nodes.push({
  type: 'frame', layout: 'none', x: 0, y: 0, width: W, height: H,
  gap: 0, padding: 0, fillColor: '#FFFFFF',
  children: children.filter((n) => n.type !== 'connector')
});
nodes.push(...children.filter((n) => n.type === 'connector'));
fs.writeFileSync(out, JSON.stringify({ version: 2, nodes }, null, 2));
