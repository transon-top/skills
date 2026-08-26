// 渲染器:把 <srcDir>/*.mmd 渲染为 <outDir>/*.svg
// 用法: node render-diagrams.mjs <srcDir> <outDir> [theme-name]
//   theme-name 默认 github-light;可选 zinc-light / tokyo-night-light / nord-light 等 THEMES 键
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid';

const [srcDir, outDir = srcDir, want = 'github-light'] = process.argv.slice(2);
if (!srcDir) {
  console.error('用法: node render-diagrams.mjs <srcDir> <outDir> [theme]');
  process.exit(1);
}
const theme = THEMES[want];
if (!theme) {
  console.error(`未知主题: ${want}。可用: ${Object.keys(THEMES).join(', ')}`);
  process.exit(1);
}

const options = {
  bg: '#FFFFFF',
  font: `Inter, PingFang SC, "Noto Sans SC", sans-serif`,
  ...theme,
};

let n = 0;
for (const f of readdirSync(srcDir).filter((x) => x.endsWith('.mmd')).sort()) {
  const src = readFileSync(`${srcDir}/${f}`, 'utf8');
  const svg = renderMermaidSVG(src, options)
    // beautiful-mermaid 默认注入 Google Fonts @import,课程要求自包含/离线可用,剥掉
    .replace(/@import url\('https:\/\/fonts\.googleapis\.com[^']*'\);\s*/g, '');
  if (!svg.startsWith('<svg')) throw new Error(`render failed: ${f}`);
  const out = f.replace(/\.mmd$/, '.svg');
  writeFileSync(`${outDir}/${out}`, svg);
  console.log(`${f} -> ${out} (${svg.length} bytes)`);
  n++;
}
console.log(`done: ${n} diagram(s) with theme "${want}"`);
