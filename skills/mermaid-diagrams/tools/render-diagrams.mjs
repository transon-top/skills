// 渲染器:把 Mermaid 图源(.mmd)渲染为离线自包含 SVG,或渲染为终端 / 纯文本可读的文本图
// 用法:
//   node render-diagrams.mjs <srcDir> [outDir] [theme]    # 目录批量:*.mmd -> *.svg / *.txt
//   node render-diagrams.mjs <file.mmd> [out | outDir] [theme] # 单文件
//   node render-diagrams.mjs - [theme]                    # stdin -> stdout
//   --format svg|ascii:输出格式,默认 svg;ascii 出文本图(Unicode 制表符画框)
//   任意输入方式加 --preview:生成临时 HTML 并调用浏览器打开
//   theme 默认 github-light;可选键见 references/themes.md
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { renderMermaidSVG, renderMermaidASCII, THEMES } from 'beautiful-mermaid';

const USAGE = `用法:
  node render-diagrams.mjs <srcDir> [outDir] [theme]    # 目录批量:*.mmd -> *.svg / *.txt
  node render-diagrams.mjs <file.mmd> [out | outDir] [theme] # 单文件
  node render-diagrams.mjs - [theme]                    # stdin -> stdout
  --format svg|ascii:输出格式,默认 svg
  --preview:生成临时 HTML 并在浏览器打开`;

const isTheme = (s) => s !== undefined && Object.prototype.hasOwnProperty.call(THEMES, s);

// 位置参数落空时的报错:顺手列出可用主题,拼错主题名的人一眼能对上
function failArg(x) {
  console.error(`无法识别的参数: ${x}\n若这是主题名,可用: ${Object.keys(THEMES).join(', ')}\n${USAGE}`);
  process.exit(1);
}

const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

function pickTheme(name = 'github-light') {
  if (!THEMES[name]) {
    console.error(`未知主题: ${name}。可用: ${Object.keys(THEMES).join(', ')}`);
    process.exit(1);
  }
  return name;
}

function renderSvg(src, themeName, label) {
  const options = {
    bg: '#FFFFFF',
    font: `Inter, PingFang SC, "Noto Sans SC", sans-serif`,
    ...THEMES[themeName],
  };
  const svg = renderMermaidSVG(src, options)
    // beautiful-mermaid 默认注入 Google Fonts @import;自包含/离线可用要求,剥掉
    .replace(/@import url\('https:\/\/fonts\.googleapis\.com[^']*'\);\s*/g, '');
  if (!svg.startsWith('<svg')) throw new Error(`render failed: ${label}`);
  return svg;
}

// 把 fg 按 pct 比例混进 bg;复刻 SVG 渲染器的 color-mix(),让两种格式同主题观感一致
function mixHex(fg, bg, pct) {
  const rgb = (hex) => {
    const h = hex.replace('#', '');
    const s = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  const [f, b] = [rgb(fg), rgb(bg)];
  return `#${f.map((v, i) => Math.round(v * pct + b[i] * (1 - pct)).toString(16).padStart(2, '0')).join('')}`;
}

// 文本图:Unicode 制表符画框。colorMode 为 none 时纯文本,hex 色值只在终端 / HTML 里显形
function renderAscii(src, themeName, colorMode, label) {
  const c = THEMES[themeName];
  const out = renderMermaidASCII(src, {
    colorMode,
    theme: {
      bg: c.bg,
      fg: c.fg,
      accent: c.accent,
      line: c.line ?? mixHex(c.fg, c.bg, 0.35),
      border: c.border ?? mixHex(c.fg, c.bg, 0.12),
      arrow: c.accent ?? mixHex(c.fg, c.bg, 0.6),
    },
  });
  if (!out.trim()) throw new Error(`render failed: ${label}`);
  return out;
}

const render = (src, themeName, colorMode, label) =>
  format === 'ascii' ? renderAscii(src, themeName, colorMode, label) : renderSvg(src, themeName, label);

// 把渲染结果拼成临时 HTML 并调用系统默认浏览器打开
// sources: [{ src, label }];文本图按 html 色模式重渲染,浏览器里同样带主题色
function preview(sources, title, themeName) {
  const file = join(tmpdir(), 'mermaid-preview.html');
  const body = sources.map(({ src, label }) => {
    if (format !== 'ascii') return `<figure>${renderSvg(src, themeName, label)}</figure>`;
    // 库在 html 色模式下自带 <span> 上色并转义标签文本,直接嵌进 <pre>
    return `<figure><pre>${renderAscii(src, themeName, 'html', label)}</pre></figure>`;
  }).join('\n');
  const html = `<!doctype html>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { margin: 0; padding: 24px; background: #f6f8fa; font: 14px/1.5 -apple-system, "PingFang SC", sans-serif; }
  figure { margin: 0 0 24px; padding: 16px; background: #fff; border: 1px solid #d1d9e0; border-radius: 8px; overflow: auto; }
  figure:last-child { margin-bottom: 0; }
  svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
  pre { margin: 0; font: 12px/1.4 "SF Mono", Menlo, Consolas, monospace; }
</style>
${body}`;
  writeFileSync(file, html);
  const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(opener, [file], { detached: true, stdio: 'ignore', shell: process.platform === 'win32' }).unref();
  console.log(`preview: ${file}`);
}

const argv = process.argv.slice(2);
const wantPreview = argv.includes('--preview');
const rest = argv.filter((x) => x !== '--preview');

// 输出格式:--format svg|ascii,默认 svg
let format = 'svg';
const args = [];
for (let i = 0; i < rest.length; i += 1) {
  if (rest[i] === '--format') {
    format = rest[i + 1];
    i += 1;
  } else if (rest[i].startsWith('--format=')) {
    format = rest[i].slice('--format='.length);
  } else {
    args.push(rest[i]);
  }
}
if (format !== 'svg' && format !== 'ascii') {
  console.error(`未知输出格式: ${format ?? '(缺值)'}。可用: svg, ascii\n${USAGE}`);
  process.exit(1);
}
const ext = format === 'ascii' ? '.txt' : '.svg';
if (!args.length) {
  console.error(USAGE);
  process.exit(1);
}

if (args[0] === '-') {
  // stdin -> stdout;stdout 是终端时自动带色,重定向出去即纯文本
  const themeName = pickTheme(args[1]);
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const src = Buffer.concat(chunks).toString('utf8');
  const out = render(src, themeName, 'auto', 'stdin');
  process.stdout.write(format === 'ascii' ? `${out}\n` : out);
  if (wantPreview) preview([{ src, label: 'stdin' }], 'stdin', themeName);
} else {
  let st;
  try {
    st = statSync(args[0]);
  } catch {
    console.error(`路径不存在: ${args[0]}\n${USAGE}`);
    process.exit(1);
  }

  if (st.isFile()) {
    // 单文件:<file.mmd> [out | outDir] [theme]
    // 输出位只认「带扩展名的文件路径」或「已存在的目录」,拼错的主题名两者都不像,照旧报错
    let outRef = null;
    let themeName = 'github-light';
    for (const x of args.slice(1)) {
      if (isTheme(x)) themeName = x;
      else if (outRef === null && (isDir(x) || /\.[^/]+$/.test(x))) outRef = x;
      else failArg(x);
    }
    pickTheme(themeName);
    const defaultOut = args[0].replace(/\.mmd$/, ext);
    const outPath = outRef === null ? defaultOut : isDir(outRef) ? join(outRef, basename(defaultOut)) : outRef;
    const src = readFileSync(args[0], 'utf8');
    const out = render(src, themeName, 'none', args[0]);
    writeFileSync(outPath, format === 'ascii' ? `${out}\n` : out);
    console.log(`${args[0]} -> ${outPath} (${out.length} bytes)`);
    if (wantPreview) preview([{ src, label: args[0] }], args[0], themeName);
  } else {
    // 目录批量:<srcDir> [outDir] [theme]
    const srcDir = args[0];
    let outDir = null;
    let themeName = 'github-light';
    for (const x of args.slice(1)) {
      if (isTheme(x)) themeName = x;
      else if (outDir === null) outDir = x;
      else failArg(x);
    }
    outDir ??= srcDir;
    pickTheme(themeName);
    mkdirSync(outDir, { recursive: true });
    const sources = [];
    for (const f of readdirSync(srcDir).filter((x) => x.endsWith('.mmd')).sort()) {
      const src = readFileSync(`${srcDir}/${f}`, 'utf8');
      const out = render(src, themeName, 'none', f);
      const outFile = f.replace(/\.mmd$/, ext);
      writeFileSync(`${outDir}/${outFile}`, format === 'ascii' ? `${out}\n` : out);
      console.log(`${f} -> ${outFile} (${out.length} bytes)`);
      sources.push({ src, label: f });
    }
    console.log(`done: ${sources.length} diagram(s) with theme "${themeName}" (format: ${format})`);
    if (wantPreview) preview(sources, srcDir, themeName);
  }
}
