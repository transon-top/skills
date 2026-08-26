// 锚点校验器:核对 .mmd 节点名 ↔ 仓库代码实体,自动验证"节点可追溯代码"
// 用法: node verify-anchors.mjs <图源目录> <仓库根> [图名...] [--strict]
//   图名缺省 = 全部 .mmd; 图名可重复出现多次、支持前缀匹配
// 检查规则:
//   1. 节点名从 label(第一个 <br/> 之前)提取,去掉「· 」职能与序号标注
//   2. 每个节点名必须命中一个代码实体:文件/目录路径,或代码文件内容里的词边界匹配
//      (只索引 .ts/.tsx/.js/.mjs/.py/.json/.yml/.yaml —— 文档 .md 不算代码证据)
//   3. --strict 时所有节点必须命中(否则退出码 1);默认只报告,退出码 0
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const [diagramDir, repoRoot, ...args] = process.argv.slice(2);
if (!diagramDir || !repoRoot) {
  console.error('用法: node verify-anchors.mjs <图源目录> <仓库根> [图名...] [--strict]');
  process.exit(1);
}

const strict = args.includes('--strict');
const wanted = args.filter((x) => x !== '--strict');

const SKIP = ['node_modules', '.git', 'dist', 'lib', 'build', 'coverage', 'vendor', 'assets', 'lessons', 'source', 'website', '.turbo', 'docs', 'examples', 'patches', 'src-tauri'];
const CODE_EXT = /\.(ts|tsx|js|mjs|py|json|yml|yaml)$/;

// 收集两层证据:代码文件内容 + 仓库相对路径(路径也算"目录/文件即实体")
const contents = [];
const paths = [];
function collect(root, base = root) {
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.env') continue;
      if (SKIP.includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        paths.push(relative(base, p));
        walk(p);
      } else if (CODE_EXT.test(e.name) && statSync(p).size <= 1024 * 1024) {
        paths.push(relative(base, p));
        try {
          contents.push(readFileSync(p, 'utf8'));
        } catch {
          /* 二进制/权限跳过 */
        }
      }
    }
  };
  walk(root);
}
collect(repoRoot);
console.log(`索引 ${contents.length} 个代码文件、${paths.length} 个路径(跳过文档/资产/vendor)`);

// 内容词边界匹配:name 两侧不是 [A-Za-z0-9_./-] 即算边界(容忍 .ts 后缀与路径分隔)
function contentHit(content, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_./-])${esc}([^A-Za-z0-9_./-]|$)`, 'm').test(content);
}

// 路径匹配:name 作为路径组件(两侧是 / \ - 或串边界)即命中,如 agent-loop / bin.ts
function pathHit(path, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_])${esc}([^A-Za-z0-9_]|$)`, 'm').test(path);
}

// 节点行形如:  id["label"] / id{"label"} / id("label") 取 label 首行(第一个 <br/> 之前)
function labelFromLine(line) {
  const styles = [/\["([^"]*)"/, /\{([^}]*)\}/, /\( "?([^"]*)"? \)/, /"([^"]+)"\s*$/];
  for (const re of styles) {
    const m = line.match(re);
    if (m) {
      const s = (m[1] ?? '').trim().split(/<br\/?>/i)[0].trim();
      if (s) return s;
    }
  }
  return null;
}

// 标签里的代码原名:取「xx · 职能」的 xx,去掉末尾序号与括号
function codeName(label) {
  return label.split('·')[0].split('#')[0].split('(')[0].trim();
}

const mmdFiles = readdirSync(diagramDir)
  .filter((f) => f.endsWith('.mmd'))
  .sort()
  .filter((f) => {
    if (!wanted.length) return true;
    const base = f.replace(/\.mmd$/, '');
    return wanted.some((w) => base === w || base.startsWith(w));
  });

if (!mmdFiles.length) {
  console.error(`图源目录 ${diagramDir} 中没有匹配的 .mmd 文件`);
  process.exit(1);
}

const cache = new Map();
function hit(name) {
  if (cache.has(name)) return cache.get(name);
  const ok = contents.some((c) => contentHit(c, name)) || paths.some((p) => pathHit(p, name));
  cache.set(name, ok);
  return ok;
}

let failed = 0;
let checked = 0;
let skipped = 0;
for (const f of mmdFiles) {
  const src = readFileSync(join(diagramDir, f), 'utf8');
  // 概念豁免:图源含 "%% concept" 注释 = 本图是概念图(语法课/方法论),不要求节点锚代码
  if (src.includes('%% concept')) {
    skipped++;
    console.log(`⏭ ${f}: 概念图豁免(--strict 仍跳过)`);
    continue;
  }
  const seen = new Set();
  for (const line of src.split('\n')) {
    if (!line.includes('"') && !line.includes('{')) continue;
    if (/--[->\s]|\.\.>|-->|===/.test(line)) continue; // 边行
    const label = labelFromLine(line);
    if (!label) continue;
    const name = codeName(label);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    checked++;
    if (hit(name)) console.log(`✓ ${f}: ${name}`);
    else {
      failed++;
      console.log(`✗ ${f}: 「${name}」 在仓库代码(路径/符号)中找不到`);
    }
  }
}

if (failed && strict) {
  console.error(`\n${failed} 个节点未通过锚点校验(--strict)`);
  process.exit(1);
}
console.log(`\n${mmdFiles.length} 图,${checked} 节点,${failed} 未命中,${skipped} 概念图豁免${strict ? '(strict)' : ''}`);
