import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const base = '05-转正答辩/正文-重构版本/开放能力资源';
const doc = 'Sr0XdHbP5oAiWzxXjfgcH3iznWd';
const before = JSON.parse(fs.readFileSync(`${base}/精简前快照.json`, 'utf8')).document;
const desired = fs.readFileSync(`${base}/待同步正文.xml`, 'utf8');
const ledgerPath = `${base}/布局同步记录.json`;
const ledger = fs.existsSync(ledgerPath)
  ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))
  : { sections: {}, moved: [], skill: null };
const save = () => fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
function cli(args, input) {
  const r = JSON.parse(execFileSync('lark-cli', args, { input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
  if (!r.ok || ['partial_success', 'failed'].includes(r.data?.result)) throw Error(JSON.stringify(r));
  return r.data;
}
const fetchDoc = () => cli(['docs', '+fetch', '--doc', doc, '--detail', 'full', '--as', 'user']).document;
function parse(xml) {
  const py = `import sys,json,xml.etree.ElementTree as E
r=E.fromstring('<root>'+sys.stdin.read()+'</root>')
def node(e):return {'tag':e.tag,'id':e.get('id'),'text':''.join(e.itertext()),'xml':E.tostring(e,encoding='unicode')}
print(json.dumps({'top':[node(e) for e in r],'all':[node(e) for e in r.iter() if e.get('id')],'media':[dict(node(e),token=e.get('token') or e.get('src')) for e in r.iter() if e.tag in ['img','whiteboard']]},ensure_ascii=False))`;
  return JSON.parse(execFileSync('python3', ['-c', py], { input: xml, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
}
const original = parse(before.content);
const target = parse(desired);
function sections(blocks) {
  const out = new Map();
  let current;
  for (const b of blocks) {
    if (['h2', 'h3'].includes(b.tag)) {
      current = { heading: b, body: [] };
      out.set(b.text, current);
    } else if (current) current.body.push(b);
  }
  return out;
}
const oldSections = sections(original.top);
const newSections = sections(target.top);
const oldMd = fs.readFileSync(`${base}/精简前正文.md`, 'utf8');
const oldKeys = [...oldMd.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)]
  .map(m => path.basename(m[1])).filter(k => k.startsWith('图片'));
const oldImages = original.media.filter(m => m.tag === 'img');
if (oldKeys.length !== oldImages.length) throw Error('原图片索引数量不一致');
const media = new Map(oldKeys.map((key, i) => [key, oldImages[i]]));
const boardKeys = [...oldMd.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)]
  .map(m => path.basename(m[1])).filter(k => !k.startsWith('图片'));
const oldBoards = original.media.filter(m => m.tag === 'whiteboard');
if (boardKeys.length !== oldBoards.length) throw Error('原画板索引数量不一致');
boardKeys.forEach((key, i) => media.set(key, oldBoards[i]));
function write(command, id, content, src) {
  const args = ['docs', '+update', '--doc', doc, '--command', command, '--block-id', id, '--as', 'user'];
  if (content !== undefined) args.push('--content', '-');
  if (src) args.push('--src-block-ids', src);
  return cli(args, content);
}
const live = fetchDoc();
if (!Object.keys(ledger.sections).length && !ledger.skill && live.content !== before.content) {
  throw Error('快照后正文发生变化，先核对同期修改');
}
if (!ledger.skill) {
  const r = cli(['docs', '+media-insert', '--doc', doc, '--file', `${base}/Skill架构.jpg`, '--as', 'user']);
  ledger.skill = { id: r.block_id, token: r.file_token, tag: 'img' };
  save();
}
media.set('Skill架构.jpg', ledger.skill);

for (const [name, next] of newSections) {
  // The user already adjusted these two overview figures and their captions.
  if (name === '2.3 技术建设') continue;
  const state = ledger.sections[name] ??= { inserted: false, done: false, anchors: {} };
  if (state.done) continue;
  const old = oldSections.get(name);
  let content = next.body.map(b => b.xml).join('\n');
  const keys = [...content.matchAll(/<asset key="([^"]+)" alt="([^"]*)"\s*\/>/g)].map(m => m[1]);
  content = content.replace(/<asset key="([^"]+)" alt="([^"]*)"\s*\/>/g,
    (_, key, alt) => `<p>【资源定位:${key}】</p><p align="center"><span text-color="gray">${alt}</span></p>`);
  if (!state.inserted) {
    const current = parse(fetchDoc().content);
    if (old) {
      for (const b of old.body) {
        const existing = current.top.find(x => x.id === b.id);
        if (!existing || existing.text !== b.text) throw Error(`检测到同期修改 ${name} ${b.id}`);
      }
    }
    write('block_insert_after', old?.heading.id ?? '-1', old ? content : next.heading.xml + content);
    state.inserted = true;
    save();
  }
  const current = parse(fetchDoc().content);
  for (const key of keys) {
    if (ledger.moved.includes(key)) continue;
    const anchor = current.all.find(b => b.tag === 'p' && b.text === `【资源定位:${key}】`);
    const resource = media.get(key);
    if (!anchor || !resource?.id) throw Error(`资源或位置缺失 ${key}`);
    write('block_move_after', anchor.id, undefined, resource.id);
    state.anchors[key] = anchor.id;
    ledger.moved.push(key);
    save();
  }
  const checked = parse(fetchDoc().content);
  const deleteIds = Object.values(state.anchors).filter(id => checked.all.some(b => b.id === id));
  if (old) {
    for (const b of old.body) {
      if (['img', 'whiteboard'].includes(b.tag)) {
        if (!checked.media.some(m => m.id === b.id)) throw Error(`原资源丢失 ${b.id}`);
        continue;
      }
      const remaining = checked.top.find(x => x.id === b.id);
      if (!remaining) continue;
      if (remaining.text !== b.text) throw Error(`旧内容发生同期编辑，保留 ${b.id}`);
      if (/<(?:img|whiteboard)\b/.test(remaining.xml)) throw Error(`旧块仍含资源，停止删除 ${b.id}`);
      deleteIds.push(b.id);
    }
  }
  if (deleteIds.length) write('block_delete', deleteIds.join(','));
  state.done = true;
  save();
  console.log(`已同步 ${name}，保留并移动 ${keys.length} 个资源`);
}
const final = fetchDoc();
const parsed = parse(final.content);
for (const m of original.media) {
  if (!parsed.media.some(x => x.id === m.id && x.token === m.token)) throw Error(`原资源未保留 ${m.id}`);
}
if (final.content.includes('【资源定位:')) throw Error('存在临时定位标记');
fs.writeFileSync(`${base}/精简后回读.json`, JSON.stringify({ document: final }, null, 2));
console.log(JSON.stringify({ revision: final.revision_id, images: parsed.media.filter(x => x.tag === 'img').length, boards: parsed.media.filter(x => x.tag === 'whiteboard').length, originalMediaPreserved: original.media.length }));
