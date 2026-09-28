// 层 3 的判定器:给一份产物目录,按 SKILL.md 的「拆图:总览 + 展开」逐条打分
// 不调用模型,纯粹结构检查——所以 agent 跑完能自动判,人也能拿它审自己画的图组
//
// 用法:
//   node check-artifacts.mjs <dir> [--require-expansion | --no-expansion] [--expect-groups N] [--expect-ext .svg|.txt]
//
// 图组约定:<名>-1.mmd 是总览,-2 / -3 是子图;没有后缀的单张图自成一组,不参与展开检查
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

const HEADER_WORDS = new Set([
  'graph', 'flowchart', 'classdiagram', 'statediagram-v2', 'statediagram', 'sequencediagram',
  'erdiagram', 'xychart-beta', 'xychart', 'participant', 'actor', 'class', 'subgraph', 'end',
  'direction', 'click', 'style', 'classdef', 'bar', 'line', 'x-axis', 'y-axis', 'axis', 'title',
  'autonumber', 'loop', 'alt', 'else', 'opt', 'par', 'note', 'over', 'rect', 'state', 'accTitle',
  'accDescr', 'section', 'gitgraph', 'journey', 'quadrantChart', 'mindmap', 'timeline',
]);

export const kindOf = (src) => {
  const head = src.trim().split('\n')[0].trim().toLowerCase();
  if (head.startsWith('xychart')) return 'xychart';
  if (head.startsWith('sequencediagram')) return 'sequence';
  if (head.startsWith('classdiagram')) return 'class';
  if (head.startsWith('erdiagram')) return 'er';
  return 'flow';
};

// 括号内容、边标签、类名简写替换成等长空格:剥掉装饰的同时保住字符偏移,便于按位置取「最左节点」
const blankDecor = (line) =>
  line
    .replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, (s) => ' '.repeat(s.length))
    .replace(/\|[^|]*\|/g, (s) => ' '.repeat(s.length))
    .replace(/:::[A-Za-z0-9_-]+/g, (s) => ' '.repeat(s.length));

const NODE = /[A-Za-z0-9_一-鿿]+/g;
// 箭头运算符,长的排前面,免得 --o 抢先吃掉 ||--o{
const ARROW = /<==>|<-->|<-\.->|<--|-->|\.\.\|>|\|\|--[o|{]|\}o--\|\||==[>o|x]|--[>xo|]|-\.->|\|\||--|\.\.|:::/;
// 收尾括号必须真吃到,否则惰性标签组会退化成空串
const SHAPE = /([A-Za-z0-9_一-鿿]+)\s*(?:\[\(?|\(\(|\(|\{\{|\{|>)\s*([^\]\)\}\n]*?)\s*[\]\)\}]/g;

// 启发式节点抽取:覆盖 flowchart / state / class / sequence / er。
// 返回 [{ id, label }],按出现顺序。xychart 无节点语义,返回空
export function nodes(src) {
  const kind = kindOf(src);
  if (kind === 'xychart') return [];
  const ordered = [];
  const seen = new Set();
  const add = (id, label) => {
    const key = (id ?? '').trim();
    if (!key || HEADER_WORDS.has(key.toLowerCase()) || key === '[*]') return;
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push({ id: key, label: (label ?? key).trim() || key });
  };

  let depth = 0; // class 体 / subgraph 体的花括号深度
  let headerDone = false;
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('%%')) continue;
    if (!headerDone) { headerDone = true; continue; } // 首行是图类型声明,不是节点
    const braceDelta = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;

    if (depth === 0) {
      const candidates = [];
      if (kind === 'sequence') {
        const p = line.match(/^(?:participant|actor)\s+([A-Za-z0-9_一-鿿]+)/i);
        if (p) candidates.push({ pos: 0, id: p[1] });
      }
      // 冒号右边是消息 / 关系名,不是节点
      const colon = line.indexOf(':');
      const head = colon === -1 ? line : line.slice(0, colon);
      // 同一行里按字符位置排:标签在括号里,裸 id 在箭头两侧,谁先出现谁是首节点
      for (const m of head.matchAll(SHAPE)) candidates.push({ pos: m.index, id: m[1], label: m[2] });
      const blanked = blankDecor(head);
      for (const part of blanked.split(ARROW)) {
        const base = blanked.indexOf(part);
        for (const m of part.matchAll(NODE)) candidates.push({ pos: base + m.index, id: m[0] });
      }
      candidates.sort((a, b) => a.pos - b.pos);
      for (const c of candidates) add(c.id, c.label);
    }
    depth = Math.max(0, depth + braceDelta);
  }
  return ordered;
}

const ELLIPSIS = /…|\.\.\./;

// 单个图组的判定。返回 { name, checks: [{ ok, label, detail }] }
export function checkGroup(name, files) {
  const checks = [];
  const push = (ok, label, detail = '') => checks.push({ ok, label, detail });
  const wanted = files.map((f) => f.n).sort((a, b) => a - b);
  const contiguous = wanted.every((n, i) => n === i + 1);
  push(contiguous, '编号连续', `得到 ${wanted.join(',')}`);

  const sources = files.map((f) => ({ ...f, src: readFileSync(f.path, 'utf8') }));
  for (const f of sources) f.nodes = nodes(f.src);

  for (const f of sources) {
    const labels = f.nodes.map((n) => n.label).join(' ');
    push(!ELLIPSIS.test(labels), `${basename(f.path)} 无省略号`, labels.slice(0, 60));
  }

  const overview = sources.find((f) => f.n === 1);
  const subs = sources.filter((f) => f.n > 1);
  if (!overview || subs.length === 0) return { name, checks, expanded: false };

  const overviewKeys = new Set(overview.nodes.flatMap((n) => [n.id, n.label]));
  const firsts = [];
  for (const sub of subs) {
    const first = sub.nodes[0];
    const ok = Boolean(first) && overviewKeys.has(first.id);
    push(ok, `${basename(sub.path)} 首节点在总览里`, ok ? String(first.id) : `首节点 ${first?.id ?? '(空)'} 不在总览`);
    if (first) firsts.push(first.id);
  }
  push(new Set(firsts).size === firsts.length, '各子图展开不同节点', firsts.join(','));

  const subTotal = subs.reduce((sum, s) => sum + s.nodes.length, 0);
  push(overview.nodes.length > 0 && overview.nodes.length < subTotal, '总览是骨架', `总览 ${overview.nodes.length} 节点 / 子图合计 ${subTotal}`);
  return { name, checks, expanded: true };
}

// 扫描目录:产出物必须与源同目录同名(扩展名随格式),图组按 -<n> 后缀归并
export function checkDir(dir, { requireExpansion = false, noExpansion = false, expectGroups = 0, expectExt = null } = {}) {
  const mmd = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.mmd')) mmd.push(p);
    }
  };
  walk(dir);

  const groups = new Map();
  for (const path of mmd) {
    const base = basename(path, '.mmd');
    const m = base.match(/^(.*?)-(\d+)$/);
    const name = m ? m[1] : base;
    const n = m ? Number(m[2]) : 1;
    groups.set(name, [...(groups.get(name) ?? []), { path, n }]);
  }

  const results = [];
  for (const [name, files] of [...groups].sort()) {
    const group = checkGroup(name, files);
    for (const f of files) {
      const dir2 = dirname(f.path);
      const exts = expectExt ? [expectExt] : ['.svg', '.txt'];
      const produced = exts.some((e) => {
        try { return statSync(join(dir2, basename(f.path, '.mmd') + e)).isFile(); } catch { return false; }
      });
      group.checks.push({ ok: produced, label: `${basename(f.path)} 有产物`, detail: exts.join(' / ') });
    }
    results.push(group);
  }

  const expandedCount = results.filter((r) => r.expanded).length;
  if (requireExpansion) {
    results.push({
      name: '(全局)',
      checks: [{ ok: expandedCount > 0, label: '至少有一组做了总览 + 展开', detail: `展开组数 ${expandedCount}` }],
      expanded: false,
    });
  }
  if (noExpansion) {
    results.push({
      name: '(全局)',
      checks: [{ ok: expandedCount === 0, label: 'lite 模式:不出展开子图', detail: `展开组数 ${expandedCount}` }],
      expanded: false,
    });
  }
  if (expectGroups > 0) {
    results.push({
      name: '(全局)',
      checks: [{ ok: results.filter((r) => r.name !== '(全局)').length >= expectGroups, label: `图组数 >= ${expectGroups}`, detail: `实际 ${results.length}` }],
      expanded: false,
    });
  }
  return results;
}

export function report(results, dir = '') {
  let failed = 0;
  for (const group of results) {
    const bad = group.checks.filter((c) => !c.ok);
    failed += bad.length;
    console.log(`${bad.length ? '✖' : '✔'} 图组 ${group.name}${group.expanded ? ' (总览 + 展开)' : ''}`);
    for (const c of bad) console.log(`    ✖ ${c.label}${c.detail ? ` — ${c.detail}` : ''}`);
    for (const c of group.checks.filter((x) => x.ok)) console.log(`    ✔ ${c.label}${c.detail ? ` — ${c.detail}` : ''}`);
  }
  if (dir) console.log(`\n${failed ? 'FAIL' : 'PASS'}: ${relative(process.cwd(), dir)} — ${failed} 项不合格`);
  return failed;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const argv = process.argv.slice(2);
  const dir = argv.find((a) => !a.startsWith('--'));
  const opt = {
    requireExpansion: argv.includes('--require-expansion'),
    noExpansion: argv.includes('--no-expansion'),
    expectGroups: Number(argv[argv.indexOf('--expect-groups') + 1] ?? 0) || 0,
    expectExt: argv.includes('--expect-ext') ? argv[argv.indexOf('--expect-ext') + 1] : null,
  };
  if (!dir) {
    console.error('用法: node check-artifacts.mjs <dir> [--require-expansion | --no-expansion] [--expect-groups N] [--expect-ext .svg|.txt]');
    process.exit(2);
  }
  process.exit(report(checkDir(dir, opt), dir) ? 1 : 0);
}
