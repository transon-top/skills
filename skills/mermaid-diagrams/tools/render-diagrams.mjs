// 渲染器:把 Mermaid 图源(.mmd)渲染为离线自包含 SVG
// 用法:
//   node render-diagrams.mjs <srcDir> [outDir] [theme]    # 目录批量:*.mmd -> *.svg
//   node render-diagrams.mjs <file.mmd> [out.svg] [theme] # 单文件
//   node render-diagrams.mjs - [theme]                    # stdin -> stdout
//   任意模式加 --preview:生成临时 HTML 并调用浏览器打开
//   theme 默认 github-light;可选键见 references/themes.md
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid';

const USAGE = `用法:
  node render-diagrams.mjs <srcDir> [outDir] [theme]    # 目录批量:*.mmd -> *.svg
  node render-diagrams.mjs <file.mmd> [out.svg] [theme] # 单文件
  node render-diagrams.mjs - [theme]                    # stdin -> stdout
  任意模式加 --preview:生成临时 HTML 并在浏览器打开`;

const isTheme = (s) => s !== undefined && Object.prototype.hasOwnProperty.call(THEMES, s);

function pickTheme(name = 'github-light') {
  if (!THEMES[name]) {
    console.error(`未知主题: ${name}。可用: ${Object.keys(THEMES).join(', ')}`);
    process.exit(1);
  }
  return name;
}

function render(src, themeName, label) {
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

// 把渲染结果拼成临时 HTML 并调用系统默认浏览器打开
function preview(svgs, title) {
  const file = join(tmpdir(), 'mermaid-preview.html');
  const html = `<!doctype html>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { margin: 0; padding: 24px; background: #f6f8fa; font: 14px/1.5 -apple-system, "PingFang SC", sans-serif; }
  figure { margin: 0 0 24px; padding: 16px; background: #fff; border: 1px solid #d1d9e0; border-radius: 8px; overflow: auto; }
  figure:last-child { margin-bottom: 0; }
  svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
</style>
${svgs.map((s) => `<figure>${s}</figure>`).join('\n')}`;
  writeFileSync(file, html);
  const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(opener, [file], { detached: true, stdio: 'ignore', shell: process.platform === 'win32' }).unref();
  console.log(`preview: ${file}`);
}

const argv = process.argv.slice(2);
const wantPreview = argv.includes('--preview');
const args = argv.filter((x) => x !== '--preview');
if (!args.length) {
  console.error(USAGE);
  process.exit(1);
}

if (args[0] === '-') {
  // stdin -> stdout
  const themeName = pickTheme(args[1]);
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const svg = render(Buffer.concat(chunks).toString('utf8'), themeName, 'stdin');
  process.stdout.write(svg);
  if (wantPreview) preview([svg], 'stdin');
} else {
  let st;
  try {
    st = statSync(args[0]);
  } catch {
    console.error(`路径不存在: ${args[0]}\n${USAGE}`);
    process.exit(1);
  }

  if (st.isFile()) {
    // 单文件:<file.mmd> [out.svg] [theme]
    let outPath = null;
    let themeName = 'github-light';
    for (const x of args.slice(1)) {
      if (x.endsWith('.svg')) outPath = x;
      else if (isTheme(x)) themeName = x;
      else {
        console.error(`无法识别的参数: ${x}\n${USAGE}`);
        process.exit(1);
      }
    }
    pickTheme(themeName);
    outPath ??= args[0].replace(/\.mmd$/, '.svg');
    const svg = render(readFileSync(args[0], 'utf8'), themeName, args[0]);
    writeFileSync(outPath, svg);
    console.log(`${args[0]} -> ${outPath} (${svg.length} bytes)`);
    if (wantPreview) preview([svg], args[0]);
  } else {
    // 目录批量:<srcDir> [outDir] [theme]
    const srcDir = args[0];
    let outDir = null;
    let themeName = 'github-light';
    for (const x of args.slice(1)) {
      if (isTheme(x)) themeName = x;
      else if (outDir === null) outDir = x;
      else {
        console.error(`无法识别的参数: ${x}\n${USAGE}`);
        process.exit(1);
      }
    }
    outDir ??= srcDir;
    pickTheme(themeName);
    mkdirSync(outDir, { recursive: true });
    const svgs = [];
    for (const f of readdirSync(srcDir).filter((x) => x.endsWith('.mmd')).sort()) {
      const src = readFileSync(`${srcDir}/${f}`, 'utf8');
      const svg = render(src, themeName, f);
      const out = f.replace(/\.mmd$/, '.svg');
      writeFileSync(`${outDir}/${out}`, svg);
      console.log(`${f} -> ${out} (${svg.length} bytes)`);
      svgs.push(svg);
    }
    console.log(`done: ${svgs.length} diagram(s) with theme "${themeName}"`);
    if (wantPreview) preview(svgs, srcDir);
  }
}
