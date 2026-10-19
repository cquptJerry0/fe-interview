const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'diagram.json');
const W = 1640;
const H = 720;
const AXIS_X = 70;
const AXIS_Y = 620;
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
function tick(id, x) {
  return { type: 'rect', id, x: x - 1, y: AXIS_Y - 6, width: 2, height: 12, fillColor: '#3370FF', borderColor: '#3370FF', borderWidth: 0, borderRadius: 1 };
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

children.push(text('title', 60, 30, 500, 'VIMO 开放能力建设路径', 30));
children.push(text('subtitle', 60, 78, 720, '从单点程序调用，逐步演进为支撑智能化运营的业务执行基础', 16, '#646A73'));
children.push(text('y-label', 18, 122, 120, '开放能力成熟度', 15, '#646A73'));
children.push(text('x-label', 1546, 638, 70, '时间', 15, '#646A73', 'right'));
children.push(line('y-axis', [AXIS_X, AXIS_Y], [AXIS_X, 142], false, 2.5, true));
children.push(line('x-axis', [AXIS_X, AXIS_Y], [1560, AXIS_Y], false, 3, true));

// cx 同时是卡片中心、阶梯圆点位置，日期则作为 X 轴刻度，文字不再落在阶梯线上。
const stages = [
  { cx: 225,  lineY: 510, cardY: 350, title: '开放基础能力', l1: '开放基础接口　接入统一网关', l2: '接入 JWT 身份　开通接口权限', result: '具备程序调用基础', date: '04—05 月' },
  { cx: 535,  lineY: 450, cardY: 290, title: '素材操作闭环', l1: '覆盖查询能力　开放配置能力', l2: '支持关联维护　支持素材发布', result: '查询、配置、发布形成闭环', date: '05—06 月' },
  { cx: 845,  lineY: 390, cardY: 230, title: '扩展接入范围', l1: '收敛站点协议　适配网络环境', l2: '兼容调用身份　分级管控权限', result: '扩展到多环境、多业务', date: '07—08 月' },
  { cx: 1155, lineY: 330, cardY: 170, title: '完善交付观测', l1: '串联发布流程　分发客户端能力', l2: '同步用户 Skill　采集调用数据', result: '形成持续交付与观测闭环', date: '09 月' }
];
const CARD_W = 270;
const CARD_H = 134;

for (let i = 0; i < stages.length; i++) {
  const s = stages[i], x = s.cx - CARD_W / 2;
  children.push(rect('card-' + i, x, s.cardY, CARD_W, CARD_H));
  children.push(text('title-' + i, x + 20, s.cardY + 18, CARD_W - 40, s.title, 20));
  children.push(text('line1-' + i, x + 20, s.cardY + 54, CARD_W - 40, s.l1, 14, '#4E5969'));
  children.push(text('line2-' + i, x + 20, s.cardY + 80, CARD_W - 40, s.l2, 14, '#4E5969'));
  children.push(text('result-' + i, x + 20, s.cardY + 106, CARD_W - 40, '→ ' + s.result, 13, '#86909C'));
  children.push(dot('dot-' + i, s.cx, s.lineY));
  children.push(tick('tick-' + i, s.cx));
  children.push(text('date-' + i, s.cx - 110, AXIS_Y + 16, 220, s.date, 14, '#646A73', 'center'));
}

for (let i = 0; i < stages.length - 1; i++) {
  const a = stages[i], b = stages[i + 1];
  children.push(line('step-h-' + i, [a.cx + 8, a.lineY], [b.cx - 8, a.lineY]));
  children.push(line('step-v-' + i, [b.cx, a.lineY], [b.cx, b.lineY]));
}

// 未来阶段
const future = { cx: 1435, lineY: 330, cardY: 170, date: '10 月以后' };
const FW = 290, fx = future.cx - FW / 2;
children.push(line('future-h', [stages[3].cx + 8, stages[3].lineY], [future.cx, future.lineY], true, 3));
children.push(dot('future-dot', future.cx, future.lineY));
children.push(tick('future-tick', future.cx));
children.push(rect('future-card', fx, future.cardY, FW, CARD_H, true));
children.push(text('future-title', fx + 20, future.cardY + 18, FW - 40, '走向智能化运营', 20, '#4E5969'));
children.push(text('future-1', fx + 20, future.cardY + 54, FW - 40, '沉淀运营工作流', 14, '#4E5969'));
children.push(text('future-2', fx + 20, future.cardY + 80, FW - 40, '建设 Workflow Skill 与任务评测', 14, '#4E5969'));
children.push(text('future-result', fx + 20, future.cardY + 106, FW - 40, '→ 运营 Agent 完整交付任务', 13, '#86909C'));
children.push(text('future-date', future.cx - 110, AXIS_Y + 16, 220, future.date, 14, '#646A73', 'center'));

const nodes = [];
nodes.push({
  type: 'frame', layout: 'none', x: 0, y: 0, width: W, height: H,
  gap: 0, padding: 0, fillColor: '#FFFFFF',
  children: children.filter((n) => n.type !== 'connector')
});
nodes.push(...children.filter((n) => n.type === 'connector'));
fs.writeFileSync(out, JSON.stringify({ version: 2, nodes }, null, 2));
