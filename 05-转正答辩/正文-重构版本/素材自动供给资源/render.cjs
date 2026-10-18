const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const media = JSON.parse(fs.readFileSync(path.join(root, '交付信息.json'), 'utf8'));
const existingBoards = new Map(media.boards.map(board => [board.title, board]));
const markdown = fs.readFileSync(path.join(root, '..', '04-素材自动供给.md'), 'utf8');
const moveAnchors = [];
const escape = text => text.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+);)/g, '&amp;')
  .replace(/"/g, '&quot;');

function inline(text) {
  return escape(text)
    .replace(/&quot;/g, '"')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => `<a href="${escape(url)}">${label}</a>`)
    .replace(/<br>/g, '<br/>');
}

function cell(text) {
  const boardTitle = text.match(/^【画板：(.+?)】/);
  if (boardTitle) {
    const board = existingBoards.get(boardTitle[1]);
    if (!board) throw new Error(`缺少画板映射: ${boardTitle[1]}`);
    moveAnchors.push({ label: board.title, block_id: board.block_id, kind: 'whiteboard' });
    return `<p><b>${inline(board.title)}</b></p>`;
  }
  const parts = text.split(/<br><br>/).flatMap(part => part.split('<br>'));
  const result = [];
  let listType;
  for (const part of parts) {
    const type = /^\d+\.\s/.test(part) ? 'ol' : /^•\s/.test(part) ? 'ul' : undefined;
    if (listType && listType !== type) result.push(`</${listType}>`);
    if (type && listType !== type) result.push(`<${type}>`);
    listType = type;
    if (type) {
      const value = part.replace(/^(?:\d+\.|•)\s/, '');
      result.push(`<li${type === 'ol' ? ' seq="auto"' : ''}>${inline(value)}</li>`);
    } else if (part.startsWith('![')) {
      const [, , source] = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      const image = media.images[path.basename(source)];
      if (!image) throw new Error(`缺少图片映射: ${source}`);
      moveAnchors.push({ label: '面板操作记录', block_id: image.block_id, kind: 'image' });
    } else {
      result.push(`<p>${inline(part)}</p>`);
    }
  }
  if (listType) result.push(`</${listType}>`);
  return result.join('');
}

const lines = markdown.split('\n');
const out = [];
let gridRatios = [0.5, 0.5];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith('<!--')) continue;
  if (/^# /.test(line)) {
    out.push(`<h1>${inline(line.slice(2))}</h1>`);
  } else if (/^## /.test(line)) {
    out.push(`<h2>${inline(line.slice(3))}</h2>`);
  } else if (line.startsWith('【飞书画板：')) {
    const title = line.slice(6, -1);
    const board = existingBoards.get(title);
    if (!board) throw new Error(`缺少画板映射: ${title}`);
    while (++i < lines.length && lines[i].trim() !== '【/飞书画板】') {
      // 预览与编辑链接只用于本地阅读，飞书继续使用已有原生画板。
    }
    moveAnchors.push({ label: board.title, block_id: board.block_id, kind: 'whiteboard' });
    out.push(`<whiteboard token="${board.token}"></whiteboard>`);
  } else if (/^【三列表(?::|：|】)/.test(line)) {
    const widths = line.match(/^【三列表：([\d,]+)】$/)?.[1].split(',').map(Number) || [368, 368, 368];
    out.push(`<table><colgroup>${widths.map(width => `<col width="${width}"/>`).join('')}</colgroup><tbody><tr>`);
  } else if (line === '【第一列】') {
    out.push('<td vertical-align="top">');
  } else if (line === '【第二列】' || line === '【第三列】') {
    out.push('</td><td vertical-align="top">');
  } else if (line === '【/三列表】') {
    out.push('</td></tr></tbody></table>');
  } else if (/^【双栏(?::|：|】)/.test(line)) {
    gridRatios = line.match(/^【双栏：([\d.,]+)】$/)?.[1].split(',').map(Number) || [0.5, 0.5];
    out.push('<grid>');
  } else if (line === '【左栏】') {
    out.push(`<column width-ratio="${gridRatios[0]}">`);
  } else if (line === '【右栏】') {
    out.push(`</column><column width-ratio="${gridRatios[1]}">`);
  } else if (line === '【/双栏】') {
    out.push('</column></grid>');
  } else if (line.startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      const cells = lines[i].trim().slice(1, -1).split('|').map(value => value.trim());
      if (!cells.every(value => /^:?-+:?$/.test(value))) rows.push(cells);
      i++;
    }
    i--;
    const count = rows[0].length;
    const widths = count === 3 ? [350, 420, 420] : [420, 420];
    out.push(`<table><colgroup>${widths.map(width => `<col width="${width}"/>`).join('')}</colgroup>`);
    out.push(`<thead><tr>${rows[0].map(value => `<th background-color="rgb(240,244,255)" vertical-align="top"><p><b>${inline(value)}</b></p></th>`).join('')}</tr></thead><tbody>`);
    for (const row of rows.slice(1)) out.push(`<tr>${row.map(value => `<td vertical-align="top">${cell(value)}</td>`).join('')}</tr>`);
    out.push('</tbody></table>');
  } else if (line.startsWith('- ')) {
    const list = [];
    while (i < lines.length && lines[i].trim().startsWith('- ')) list.push(`<li>${inline(lines[i++].trim().slice(2))}</li>`);
    i--;
    out.push(`<ul>${list.join('')}</ul>`);
  } else if (/^\d+\.\s/.test(line)) {
    const list = [];
    while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
      list.push(`<li seq="auto">${inline(lines[i++].trim().replace(/^\d+\.\s/, ''))}</li>`);
    }
    i--;
    out.push(`<ol>${list.join('')}</ol>`);
  } else if (line.startsWith('![')) {
    const [, alt, source] = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    const image = media.images[path.basename(source)];
    if (!image) throw new Error(`缺少图片映射: ${source}`);
    let caption = alt;
    if (lines[i + 2]?.startsWith('图：')) { caption = lines[i + 2].slice(2); i += 2; }
    out.push(`<img src="${image.token}" name="${escape(path.basename(source))}" width="${image.width}" height="${image.height}" caption="${escape(caption)}"/>`);
  } else {
    out.push(`<p>${inline(line)}</p>`);
  }
}
fs.writeFileSync(path.join(root, '正文.xml'), out.join('\n'));
const full = out.join('\n');
const body = full.replace(/^<h1>[\s\S]*?<\/h1>\n/, '').replace(/<grid>[\s\S]*?<\/grid>\n/, '');
fs.writeFileSync(path.join(root, '三列表正文.xml'), body);
fs.writeFileSync(path.join(root, '资源迁移位置.json'), JSON.stringify(moveAnchors, null, 2));
console.log(`生成正文.xml 和三列表正文.xml：${out.length} 个结构片段，${moveAnchors.length} 个原生资源迁移位置`);
