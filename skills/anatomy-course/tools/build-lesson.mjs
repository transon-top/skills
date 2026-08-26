// 组装器:把 <tplDir>/*.html.tpl 中的 <!-- DIAGRAM: name --> 替换为 <diagramDir>/name.svg 内嵌,输出 <outDir>/*.html
// 用法: node build-lesson.mjs <tplDir> <diagramDir> <outDir>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const [tplDir, diagramDir, outDir] = process.argv.slice(2);
if (!tplDir || !diagramDir || !outDir) {
  console.error('用法: node build-lesson.mjs <tplDir> <diagramDir> <outDir>');
  process.exit(1);
}

for (const f of readdirSync(tplDir).filter((x) => x.endsWith('.tpl')).sort()) {
  let html = readFileSync(`${tplDir}/${f}`, 'utf8');
  html = html.replace(/<!-- DIAGRAM: ([A-Za-z0-9._-]+) -->/g, (_, name) =>
    readFileSync(`${diagramDir}/${name}.svg`, 'utf8'),
  );
  writeFileSync(`${outDir}/${f.replace(/\.tpl$/, '')}`, html);
  console.log(`built ${outDir}/${f.replace(/\.tpl$/, '')}`);
}
