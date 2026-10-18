import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { marked } from '/Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/marked/lib/marked.esm.js';

const root = process.cwd();
const base = '05-转正答辩/正文-重构版本';
const assets = `${base}/开放能力资源`;
const doc = 'Sr0XdHbP5oAiWzxXjfgcH3iznWd';
const env = { ...process.env, LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1', LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1' };
const source = JSON.parse(fs.readFileSync('05-转正答辩/优化版本的细节/开放能力原稿资源/资源索引.json', 'utf8'));
const images = new Map(source.map(x => [path.basename(x.path), x]));
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const blue = s => `<b><span text-color="rgb(36,91,219)">${s}</span></b>`;
const caption = s => `<p align="center"><span text-color="gray">${esc(s)}</span></p>`;
const rawAssets = new Map();
const specials = new Map();

function cli(args, input) {
  const out = JSON.parse(execFileSync('lark-cli', args, {
    cwd: root, env, input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  }));
  if (!out.ok || out.data?.result === 'partial_success' || out.data?.result === 'failed') {
    throw new Error(JSON.stringify(out));
  }
  return out;
}

function assetXml(key, alt) {
  if (key === '建设路径.jpg') {
    const svg = fs.readFileSync(`${assets}/建设路径.svg`, 'utf8');
    return `<whiteboard type="svg">${svg}</whiteboard>${caption(alt)}`;
  }
  const info = images.get(key);
  if (!info) throw new Error(`未识别资源 ${key}`);
  if (info.kind === '画板') {
    return `<whiteboard type="blank"></whiteboard>${caption(alt)}`;
  }
  return `<img src="${info.token}" width="${info.size[0]}" height="${info.size[1]}"/>${caption(alt)}`;
}

const renderer = new marked.Renderer();
renderer.image = ({ href, text }) => {
  const key = path.basename(href);
  rawAssets.set(key, { key, alt: text });
  return `<asset key="${esc(key)}" alt="${esc(text)}"/>`;
};
marked.use({ renderer });
function inline(text) {
  return marked.parseInline(text).replaceAll('<br>', '<br/>').replaceAll('<strong>', '<b>').replaceAll('</strong>', '</b>');
}

function paragraph(text) {
  const html = inline(text);
  const fragments = html.split(/(<asset\b[^>]*\/>)/);
  return fragments.filter(Boolean).map(s => {
    if (s.startsWith('<asset ')) return s;
    return s.trim() ? `<p>${s.trim()}</p>` : '';
  }).join('');
}

function cell(text, header) {
  if (header) return `<p>${blue(inline(text))}</p>`;
  if (text.includes('【并排】')) {
    let out = '', end = 0;
    for (const match of text.matchAll(/【并排】([\s\S]*?)【右侧】([\s\S]*?)【\/并排】/g)) {
      out += cell(text.slice(end, match.index), false);
      out += `<grid><column width-ratio="0.5">${cell(match[1], false)}</column><column width-ratio="0.5">${cell(match[2], false)}</column></grid>`;
      end = match.index + match[0].length;
    }
    return out + cell(text.slice(end), false);
  }
  const lines = text.split(/<br\s*\/?>/).map(x => x.trim()).filter(Boolean);
  let out = '', list = [];
  const flush = () => {
    if (list.length) out += `<ol>${list.map(x => `<li seq="auto">${inline(x)}</li>`).join('')}</ol>`;
    list = [];
  };
  for (const line of lines) {
    const m = line.match(/^\d+\.\s+([\s\S]*)$/);
    if (m) list.push(m[1]);
    else { flush(); out += paragraph(line); }
  }
  flush();
  return out;
}

function render(md) {
  const chunks = [];
  for (const t of marked.lexer(md)) {
    if (t.type === 'space') continue;
    if (t.type === 'heading') chunks.push(`<h${t.depth}>${inline(t.text)}</h${t.depth}>`);
    else if (t.type === 'paragraph') chunks.push(paragraph(t.text));
    else if (t.type === 'list') chunks.push(`<${t.ordered ? 'ol' : 'ul'}>${t.items.map(x => `<li${t.ordered ? ' seq="auto"' : ''}>${inline(x.text)}</li>`).join('')}</${t.ordered ? 'ol' : 'ul'}>`);
    else if (t.type === 'table') {
      const n = t.header.length;
      const widths = n === 2 ? [600, 600] : t.header[0].text === '设计整体架构' ? [480, 480, 400] : n === 3 ? [325, 325, 330] : Array(n).fill(1200 / n);
      chunks.push(`<table><colgroup>${widths.map(w => `<col width="${w}"/>`).join('')}</colgroup><thead><tr>${t.header.map(c => `<th background-color="rgb(240,244,255)" vertical-align="top">${cell(c.text, true)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row => `<tr>${row.map(c => `<td vertical-align="top">${cell(c.text, false)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    } else if (t.type === 'html') {
      const match = t.text.match(/<!--SPECIAL:(\d+)-->/);
      if (match) chunks.push(specials.get(match[1]));
      else if (!t.text.trim().startsWith('<!--')) chunks.push(t.text);
    } else throw new Error(`暂不支持 ${t.type}`);
  }
  return chunks.join('\n');
}

let md = fs.readFileSync(`${base}/02-开放能力.md`, 'utf8');
md = md.replace(/【蓝色高亮块】([\s\S]*?)【\/蓝色高亮块】/g, (_, inner) => {
  const key = String(specials.size);
  specials.set(key, `<callout background-color="light-blue" border-color="blue">${render(inner)}</callout>`);
  return `<!--SPECIAL:${key}-->`;
});
md = md.replace(/【双栏】\s*【左栏】([\s\S]*?)【右栏】([\s\S]*?)【\/双栏】/g, (_, left, right) => {
  const key = String(specials.size);
  specials.set(key, `<grid><column width-ratio="0.5">${render(left)}</column><column width-ratio="0.5">${render(right)}</column></grid>`);
  return `<!--SPECIAL:${key}-->`;
});

const xml = render(md);
function topBlocks(x) {
  const py = 'import sys,json,xml.etree.ElementTree as E\nr=E.fromstring("<root>"+sys.stdin.read()+"</root>")\nprint(json.dumps([{"tag":e.tag,"id":e.get("id"),"text":"".join(e.itertext()),"xml":E.tostring(e,encoding="unicode")} for e in r],ensure_ascii=False))';
  return JSON.parse(execFileSync('python3', ['-c', py], { input: x, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
}
const blocks = topBlocks(xml);
fs.writeFileSync(`${assets}/待同步结构.json`, JSON.stringify(blocks, null, 2));
fs.writeFileSync(`${assets}/待同步正文.xml`, xml);
if (process.argv.includes('--render-only')) {
  const countXml = xml.replace(/<asset key="[^"]+" alt="([^"]*)"\s*\/>/g, '<p>$1</p>');
  const counter = path.join(process.env.HOME, '.agents/skills/lark-doc/scripts/doc_word_stat.py');
  const stats = JSON.parse(execFileSync('python3', [counter, '--protocol', 'xml'], { input: countXml, encoding: 'utf8' }));
  console.log(JSON.stringify({ word_count: stats.word_count, char_count: stats.char_count, resources: rawAssets.size, unsupported: stats.unsupported_blocks }, null, 2));
  process.exit(0);
}

const start = prefix => {
  const result = blocks.filter(x => x.text.startsWith(prefix));
  if (result.length !== 1) throw new Error(`选择不唯一 ${prefix} ${result.length}`);
  return result[0].xml;
};
const table = prefix => {
  const result = blocks.filter(x => x.tag === 'table' && x.text.replace(/\s+/g, '').startsWith(prefix.replace(/\s+/g, '')));
  if (result.length !== 1) throw new Error(`表格不唯一 ${prefix}`);
  return result[0].xml;
};
const media = key => `<asset key="${key}" alt="${esc(rawAssets.get(key).alt)}"/>`;
const operations = [
  ['doxcnb7dsOKEepTaQWOvt7P4pWg', start('VIMO 素材管理平台')],
  ['doxcnlsblxGnypIvzJLXeklJJCh', table('业务诉求')],
  ['doxcnICBhA1dwhEXLX5tK9eBxjg', table('批量查询')],
  ['doxcn98kmGN8SSfbjkgZxfhakqf', null],
  ['doxcnci9Rac4K1jpNeGdopbFcWc', table('VIMO Agent／Capcut 运营 Agent')],
  ['doxcn5mEv0NfFckMpzxyqiI3Ahf', null],
  ['doxcnL3EysGc3lk7kx23zo19Hib', media('图片-11.png') + start('【数据待考证：上图统计')],
  ['doxcnTYokJMmYIyxNb2LlR64nJ5', start('使用指南与宣贯')],
  ['doxcnYEEx8YZBONQgv0eEoojOzh', start('接口可调用之后')],
  ['doxcns3Q0r26NNq2cBVd2riWIWg', media('建设路径.jpg') + start('【数据待考证：建设路径')],
  ['doxcnwmcDdqVLv1t8t8iloG7Pud', start('早期素材 OpenAPI')],
  ['doxcneXWa7b2Iwil5mi2MzFUEMh', start('商业化随后需要')],
  ['doxcn9wjDyds92nTVKGRi2qi4ef', media('画板-02.jpg') + start('网关承接独立开放授权') + table('网关接入')],
  ['doxcnrmYq3IvLM4O3jqAl00iTRc', table('开放业务操作')],
  ['doxcnG9fpOMyraSzUlAIMKkwFhg', start('业务接口可用后')],
  ['doxcnpgnvGu0n7pxTq22cQZ6lTc', media('画板-05.jpg')],
  ['doxcnUXSkQA42meftvk0UH74Xbh', table('组织业务命令')],
  ['doxcn56oV45M1CpOvMMuq4SYFYe', start('一次开放能力交付')],
  ['doxcnxmPFIlqHqz5CqtKEQ5oMkc', null],
  ['doxcnuw8INldoxy0AWzcKslmiRf', table('沉淀研发方法')],
];

const ledgerPath = `${assets}/插图记录.json`;
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : {
  operations: [],
  boards: [{ key: '画板-01.jpg', block_id: 'doxcnJhoLeLGMFMOCGS2oXWaKqh', token: 'D4vuwNzSIhrlI3brLtfcPjdsnXc', filled: true }],
};
const save = () => fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
const execute = process.argv.includes('--execute');
if (!execute) {
  console.log(JSON.stringify({ operations: operations.length, images: [...rawAssets.keys()].filter(k => k.startsWith('图片')).length, boards: [...rawAssets.keys()].filter(k => !k.startsWith('图片')).length, blocks: blocks.map((b, i) => ({ i, tag: b.tag, text: b.text.slice(0, 70) })) }, null, 2));
  process.exit(0);
}

for (const [id, abstract] of operations) {
  if (ledger.operations.some(x => x.id === id)) continue;
  const latest = cli(['docs', '+fetch', '--doc', doc, '--detail', 'full', '--as', 'user']).data.document;
  const current = topBlocks(latest.content).find(x => x.id === id);
  if (!current) throw new Error(`目标块已变化 ${id}`);
  const baseline = topBlocks(JSON.parse(fs.readFileSync(`${assets}/插图前快照.json`, 'utf8')).document.content).find(x => x.id === id);
  if (!baseline || baseline.text !== current.text) {
    // 插图试验只增加两张图片及图注，正文必须仍与备份一致。
    if (id !== 'doxcnICBhA1dwhEXLX5tK9eBxjg' || current.text.replace('批量查询需求Agent 汇总查询结果', '') !== baseline.text) {
      throw new Error(`检测到并行文字编辑，保留并停止 ${id}`);
    }
  }
  const keys = [];
  const content = abstract?.replace(/<asset key="([^"]+)" alt="([^"]*)"\s*\/>/g, (_, key, alt) => {
    if (!key.startsWith('图片')) keys.push(key);
    return assetXml(key, alt.replaceAll('&amp;', '&').replaceAll('&quot;', '"'));
  });
  const args = ['docs', '+update', '--doc', doc, '--command', content === undefined ? 'block_delete' : 'block_replace', '--block-id', id, '--revision-id', String(latest.revision_id), '--as', 'user'];
  if (content !== undefined) args.push('--content', '-');
  cli([...args, '--dry-run'], content);
  const result = cli(args, content);
  const created = result.data.document.new_blocks?.filter(x => x.block_type === 'whiteboard') || [];
  if (keys.length !== created.length) throw new Error(`画板返回数量不一致 ${keys.length}/${created.length}`);
  for (let i = 0; i < keys.length; i++) ledger.boards.push({ key: keys[i], block_id: created[i].block_id, token: created[i].block_token, filled: keys[i] === '建设路径.jpg' });
  ledger.operations.push({ id, revision: result.data.document.revision_id });
  save();
  console.log(`已同步 ${ledger.operations.length}/${operations.length}，版本 ${result.data.document.revision_id}`);
  for (const board of ledger.boards.filter(x => !x.filled)) {
    const num = board.key.match(/\d+/)[0];
    const data = fs.readFileSync(`${assets}/原画板-${num}.svg`, 'utf8');
    const boardArgs = ['whiteboard', '+update', '--whiteboard-token', board.token, '--input_format', 'svg', '--source', '-', '--idempotent-token', `vimo-svg-${board.token}`, '--as', 'user'];
    cli([...boardArgs, '--dry-run'], data);
    cli(boardArgs, data);
    board.filled = true;
    save();
    console.log(`已原样复制 ${board.key}`);
  }
}
const final = cli(['docs', '+fetch', '--doc', doc, '--detail', 'full', '--as', 'user']).data;
fs.writeFileSync(`${assets}/插图后回读.json`, JSON.stringify(final, null, 2));
console.log('图文同步完成，已保存回读');
