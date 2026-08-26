// 补全超链接:把每课模板(.tpl)的 `#` 占位替换为上一课/下一课/目录实际链接;
// 成品由 build-lesson.mjs 从模板重建,所以改模板而不是改成品(源 = 模板)。
// 用法: node fix-links.mjs <模板目录> [参考目录]
//   模板目录: source/lessons/  (000N-slug.html.tpl)
//   参考目录: reference/ (可选,补充 ← 目录 返链)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [tplDir = 'source/lessons', refDir] = process.argv.slice(2);

const lessonFiles = readdirSync(tplDir)
  .filter((f) => /^000\d+-.*\.html\.tpl$/.test(f))
  .sort();

let fixed = 0;
for (let i = 0; i < lessonFiles.length; i++) {
  const f = lessonFiles[i];
  let html = readFileSync(join(tplDir, f), 'utf8');
  // 成品名 = 模板名去掉 .tpl(已是 xx.html.tpl → xx.html)
  const prev = i > 0 ? lessonFiles[i - 1].replace(/\.tpl$/, '') : null;
  const next = i < lessonFiles.length - 1 ? lessonFiles[i + 1].replace(/\.tpl$/, '') : null;

  const prevLink = prev ?? 'index.html';
  const nextLink = next ?? 'index.html';

  html = html
    .replace(/<a href="#">([^<]*)← 上一课[^<]*<\/a>/g, `<a href="${prevLink}">$1← 上一课</a>`)
    .replace(/<a href="#">([^<]*)下一课[^<]*<\/a>/g, `<a href="${nextLink}">$1下一课</a>`)
    .replace(/<a href="#">([^<]*)目录[^<]*<\/a>/g, `<a href="index.html">$1目录</a>`);

  writeFileSync(join(tplDir, f), html);
  fixed++;
  console.log(`✓ ${f}: ← ${prevLink} | → ${nextLink}`);
}

// 参考页:补 ← 目录 返链(如提供 refDir)
if (refDir) {
  for (const rf of readdirSync(refDir).filter((x) => x.endsWith('.html'))) {
    const p = join(refDir, rf);
    let html = readFileSync(p, 'utf8');
    if (!html.includes('../lessons/index.html')) {
      html = html.includes('<nav>')
        ? html.replace('<nav>', `<nav><a href="../lessons/index.html">← 目录</a>`)
        : html + `\n<nav><a href="../lessons/index.html">← 目录</a></nav>\n`;
      writeFileSync(p, html);
      console.log(`✓ reference/${rf}: 补 ← 目录`);
    }
  }
}

// 校验:模板无残留 `#` 占位(目录链接指向 index.html 除外)
let leftover = 0;
for (const f of lessonFiles) {
  const html = readFileSync(join(tplDir, f), 'utf8');
  if (/href="#">/.test(html)) leftover++;
}
console.log(`\n完成: ${fixed} 课已补链;${leftover} 课仍有 # 占位`);
