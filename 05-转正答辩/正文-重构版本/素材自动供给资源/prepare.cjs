const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = __dirname;
const files = [
  ['供给链路', { '接收审核通过事件\nartist.item.change': '接收素材变更事件\nartist.item.change', '产物就绪\n且审核通过？': '供给条件\n变为满足？' }],
  ['发布对照', {}],
  ['批量对照', {}],
];

async function main() {
  for (const [name, replacements] of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(root, `${name}-原生源.json`), 'utf8'));
    for (const node of raw.nodes) {
      if (node.text && replacements[node.text.text]) node.text.text = replacements[node.text.text];
    }
    const ids = new Set(raw.nodes.map(node => node.id));
    for (const node of raw.nodes) {
      for (const endpoint of [node.connector?.start, node.connector?.end]) {
        if (endpoint?.attached_object && !ids.has(endpoint.attached_object.id)) {
          throw new Error(`${name}: 无效连接端点 ${endpoint.attached_object.id}`);
        }
      }
    }
    fs.writeFileSync(path.join(root, `${name}.json`), JSON.stringify(raw, null, 2));
    console.log(`${name}: ${raw.nodes.length} 个原生节点，连接端点有效`);
  }
  await sharp(path.join(root, '批次测试-来源.png'))
    .extract({ left: 40, top: 78, width: 1210, height: 525 })
    .png().toFile(path.join(root, '批次执行记录.png'));
  await sharp(path.join(root, '积压趋势-来源.png'))
    .extract({ left: 25, top: 125, width: 1495, height: 585 })
    .png().toFile(path.join(root, '任务积压变化.png'));
  for (const [name] of files) {
    await sharp(path.join(root, `${name}-飞书.jpg`))
      .trim({ background: '#ffffff', threshold: 10 })
      .extend({ top: 20, bottom: 20, left: 20, right: 20, background: '#ffffff' })
      .jpeg({ quality: 95 })
      .toFile(path.join(root, `${name}-预览.jpg`));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
