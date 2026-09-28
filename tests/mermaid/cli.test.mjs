// 层 1:render-diagrams.mjs 的 CLI 合约
// 跑法:node --test tests/mermaid/
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { TYPE_FIXTURES, cjkCount, displayWidth, fixture, outName, read, runCli, sandbox, waitFor } from './lib/harness.mjs';

const TYPES = Object.keys(TYPE_FIXTURES);
const ALL = [...Object.values(TYPE_FIXTURES), 'wide.mmd']; // 目录批量用的干净源集
const ANSI = /\u001b\[/; // 落盘 / 管道产物里出现它就说明色码漏出来了

describe('目录批量', () => {
  test('svg:六种图类型各出一份 .svg,均为独立 SVG', async () => {
    const box = sandbox();
    const src = box.stage(...ALL);
    const { code, stdout } = await runCli([src, box.out], { box });
    assert.equal(code, 0, stdout);
    for (const t of TYPES) {
      const file = join(box.out, outName(TYPE_FIXTURES[t], 'svg'));
      assert.ok(existsSync(file), `${t} 未产出 ${file}`);
      const svg = read(file);
      assert.match(svg, /^<svg /, `${t} 产物不是 SVG`);
      assert.match(svg, /viewBox=/, `${t} 缺 viewBox`);
    }
    assert.match(stdout, /done: 7 diagram\(s\)/);
  });

  test('ascii:六种图类型各出一份 .txt,无 ANSI 色码,以换行结尾', async () => {
    const box = sandbox();
    const src = box.stage(...ALL);
    const { code, stdout } = await runCli([src, box.out, '--format', 'ascii'], { box });
    assert.equal(code, 0, stdout);
    for (const t of TYPES) {
      const file = join(box.out, outName(TYPE_FIXTURES[t], 'ascii'));
      assert.ok(existsSync(file), `${t} 未产出 ${file}`);
      const txt = read(file);
      assert.ok(txt.trim().length > 0, `${t} 文本图为空`);
      assert.doesNotMatch(txt, ANSI, `${t} 文本图混入 ANSI 色码`);
      assert.match(txt, /\n$/, `${t} 文本图缺结尾换行`);
    }
  });

  test('产物扩展名随格式切换', async () => {
    const box = sandbox();
    const src = box.stage('flow.mmd');
    await runCli([src, box.out, '--format', 'svg'], { box });
    assert.ok(existsSync(join(box.out, 'flow.svg')));
    assert.equal(existsSync(join(box.out, 'flow.txt')), false);
    await runCli([src, box.out, '--format', 'ascii'], { box });
    assert.ok(existsSync(join(box.out, 'flow.txt')));
  });

  test('节点多寡不影响出图:12 节点流程仍出一份,12 个标签全在', async () => {
    const box = sandbox();
    const src = box.stage('wide.mmd');
    const { code } = await runCli([src, box.out], { box });
    assert.equal(code, 0);
    const svg = read(join(box.out, 'wide.svg'));
    for (let i = 1; i <= 12; i += 1) {
      const id = `N${String(i).padStart(2, '0')}`;
      assert.match(svg, new RegExp(id), `${id} 被丢弃`);
    }
  });
});

describe('单文件', () => {
  test('默认输出路径 = 源同名换扩展名,两种格式各写各的', async () => {
    const box = sandbox();
    const src = box.stage('flow.mmd');
    const mmd = join(src, 'flow.mmd');
    assert.equal((await runCli([mmd], { box })).code, 0);
    assert.ok(existsSync(join(src, 'flow.svg')));
    assert.equal((await runCli([mmd, '--format', 'ascii'], { box })).code, 0);
    assert.ok(existsSync(join(src, 'flow.txt')));
  });

  test('显式输出路径生效', async () => {
    const box = sandbox();
    const svgOut = join(box.out, 'renamed.svg');
    const txtOut = join(box.out, 'renamed.txt');
    assert.equal((await runCli([fixture('flow.mmd'), svgOut], { box })).code, 0);
    assert.equal((await runCli([fixture('flow.mmd'), txtOut, '--format', 'ascii'], { box })).code, 0);
    assert.match(read(svgOut), /^<svg /);
    assert.match(read(txtOut), /[┌└│]/);
  });

  test('主题名拼错时拒绝执行,不静默当输出路径', async () => {
    const box = sandbox();
    const { code, stderr } = await runCli([fixture('flow.mmd'), 'github-ligt'], { box });
    assert.equal(code, 1);
    assert.match(stderr, /无法识别的参数/);
  });
});

describe('stdin', () => {
  test('svg 走 stdout', async () => {
    const box = sandbox();
    const { code, stdout } = await runCli(['-'], { box, input: read(fixture('flow.mmd')) });
    assert.equal(code, 0);
    assert.match(stdout, /^<svg /);
  });

  test('ascii 走 stdout:有框线、无色码、结尾换行', async () => {
    const box = sandbox();
    const { code, stdout } = await runCli(['-', '--format', 'ascii'], {
      box,
      input: read(fixture('flow.mmd')),
    });
    assert.equal(code, 0);
    assert.match(stdout, /[┌└│►▼]/);
    assert.doesNotMatch(stdout, ANSI);
    assert.match(stdout, /\n$/);
  });
});

describe('--format 参数', () => {
  test('不传时默认 svg', async () => {
    const box = sandbox();
    const { code } = await runCli([fixture('flow.mmd'), box.out], { box });
    assert.equal(code, 0);
    assert.ok(existsSync(join(box.out, 'flow.svg')));
  });

  test('--format=ascii 与 --format ascii 等价', async () => {
    const box = sandbox();
    const eq = await runCli([fixture('flow.mmd'), join(box.out, 'a.txt'), '--format=ascii'], { box });
    const sp = await runCli([fixture('flow.mmd'), join(box.out, 'b.txt'), '--format', 'ascii'], { box });
    assert.equal(eq.code, 0);
    assert.equal(sp.code, 0);
    assert.equal(read(join(box.out, 'a.txt')), read(join(box.out, 'b.txt')));
  });

  test('未知格式退出码 1 并列出可选值', async () => {
    const box = sandbox();
    const { code, stderr } = await runCli([fixture('flow.mmd'), '--format', 'pdf'], { box });
    assert.equal(code, 1);
    assert.match(stderr, /未知输出格式: pdf/);
    assert.match(stderr, /svg, ascii/);
  });

  test('--format 缺值退出码 1', async () => {
    const box = sandbox();
    const { code, stderr } = await runCli([fixture('flow.mmd'), '--format'], { box });
    assert.equal(code, 1);
    assert.match(stderr, /\(缺值\)/);
  });
});

describe('主题', () => {
  test('拼错主题名退出码 1,并列出可用主题键', async () => {
    const box = sandbox();
    const { code, stderr } = await runCli([fixture('flow.mmd'), box.out, 'nope'], { box });
    assert.equal(code, 1);
    assert.match(stderr, /无法识别的参数: nope/);
    assert.match(stderr, /github-light/);
    assert.match(stderr, /dracula/);
  });

  test('stdin 模式下未知主题给出专属报错', async () => {
    const box = sandbox();
    const { code, stderr } = await runCli(['-', 'nope'], { box, input: read(fixture('flow.mmd')) });
    assert.equal(code, 1);
    assert.match(stderr, /未知主题: nope/);
  });

  test('同源同主题两次渲染字节一致', async () => {
    const box = sandbox();
    await runCli([fixture('flow.mmd'), join(box.out, 'x1.svg'), 'dracula'], { box });
    await runCli([fixture('flow.mmd'), join(box.out, 'x2.svg'), 'dracula'], { box });
    assert.equal(read(join(box.out, 'x1.svg')), read(join(box.out, 'x2.svg')));
  });

  test('换主题换配色', async () => {
    const box = sandbox();
    await runCli([fixture('flow.mmd'), join(box.out, 'l.svg'), 'github-light'], { box });
    await runCli([fixture('flow.mmd'), join(box.out, 'd.svg'), 'dracula'], { box });
    assert.notEqual(read(join(box.out, 'l.svg')), read(join(box.out, 'd.svg')));
  });
});

describe('自包含', () => {
  test('SVG 不带外部引用、不夹带脚本', async () => {
    const box = sandbox();
    const src = box.stage(...ALL);
    await runCli([src, box.out], { box });
    for (const t of TYPES) {
      const svg = read(join(box.out, outName(TYPE_FIXTURES[t], 'svg')));
      assert.doesNotMatch(svg, /fonts\.googleapis\.com/, `${t} 残留 Google Fonts`);
      assert.doesNotMatch(svg, /@import/, `${t} 残留 @import`);
      assert.doesNotMatch(svg, /<script/, `${t} 夹带脚本`);
      assert.doesNotMatch(svg, /(src|href)="https?:/, `${t} 引用外部资源`);
    }
  });

  test('长标签原样保留,不截断成省略号', async () => {
    const box = sandbox();
    await runCli([fixture('long-label.mmd'), box.out], { box });
    const svg = read(join(box.out, 'long-label.svg'));
    assert.match(svg, /这一段标签刻意写得非常非常长用来验证渲染器不会把它截断成省略号/);
    assert.doesNotMatch(svg, /…|\.\.\./);
  });
});

describe('--preview', () => {
  test('svg:预览页落进 TMPDIR,含内嵌 SVG,并调起浏览器', async () => {
    const box = sandbox();
    const src = box.stage('flow.mmd', 'er.mmd');
    const { stdout } = await runCli([src, box.out, '--preview'], { box });
    assert.match(stdout, /preview: /);
    const html = read(box.previewPath);
    assert.equal(html.match(/<figure><svg /g).length, 2, '目录模式应把多图并进一页');
    await waitFor(() => box.opened().length >= 1);
    assert.equal(box.opened().length, 1, '浏览器桩应被调用一次');
  });

  test('ascii:预览页用 <pre> 包住带色文本,不出现被二次转义的 span', async () => {
    const box = sandbox();
    await runCli([fixture('flow.mmd'), box.out, '--format', 'ascii', '--preview'], { box });
    const html = read(box.previewPath);
    assert.match(html, /<figure><pre><span style="color:#/);
    assert.doesNotMatch(html, /&lt;span/, 'span 被二次转义了');
  });

  test('不传 --preview 时不生成预览页、不动浏览器', async () => {
    const box = sandbox();
    const src = box.stage('flow.mmd');
    await runCli([src, box.out], { box });
    assert.equal(existsSync(box.previewPath), false);
    assert.equal(box.opened().length, 0);
  });
});

describe('健壮性', () => {
  test('路径不存在退出码 1', async () => {
    const box = sandbox();
    const { code, stderr } = await runCli([join(box.root, 'nope.mmd')], { box });
    assert.equal(code, 1);
    assert.match(stderr, /路径不存在/);
  });

  test('非法 mermaid 头退出码 1,报出原因', async () => {
    const box = sandbox();
    const { code, stderr } = await runCli([fixture('bad-header.mmd'), box.out], { box });
    assert.equal(code, 1);
    assert.match(stderr, /Invalid mermaid header/);
  });

  test('悬挂边不致命,照常出图', async () => {
    const box = sandbox();
    const { code } = await runCli([fixture('dangling-edge.mmd'), box.out], { box });
    assert.equal(code, 0);
    assert.match(read(join(box.out, 'dangling-edge.svg')), /data-id="A"/);
  });

  test('中文标签两种格式都能落盘', async () => {
    const box = sandbox();
    assert.equal((await runCli([fixture('cjk.mmd'), box.out], { box })).code, 0);
    assert.equal((await runCli([fixture('cjk.mmd'), box.out, '--format', 'ascii'], { box })).code, 0);
    assert.match(read(join(box.out, 'cjk.svg')), /主循环/);
    assert.match(read(join(box.out, 'cjk.txt')), /主循环/);
  });
});

describe('文本图与中文', () => {
  const lines = (text) => text.replace(/\n$/, '').split('\n');

  test('中文标签落盘用 Unicode 制表符画框,不退回 7-bit ASCII', async () => {
    const box = sandbox();
    await runCli([fixture('cjk.mmd'), box.out, '--format', 'ascii'], { box });
    const txt = read(join(box.out, 'cjk.txt'));
    for (const label of ['AgentLoop', '主循环', 'Planner', '规划', 'ToolRunner', '工具执行']) {
      assert.ok(txt.includes(label), `文本图丢了标签片段 ${label}`);
    }
    assert.match(txt, /[┌└│►▼]/, '没画出制表符框线');
    assert.doesNotMatch(txt, /\+-{3,}\+/, '退回了 +-| 的纯 ASCII 画法');
  });

  test('纯英文标签:每行终端列宽一致,框线对齐', async () => {
    const box = sandbox();
    await runCli([fixture('flow.mmd'), box.out, '--format', 'ascii'], { box });
    const widths = new Set(lines(read(join(box.out, 'flow.txt'))).map(displayWidth));
    assert.equal(widths.size, 1, `各行列宽不一致: ${[...widths].join(',')}`);
  });

  // 这是已知限制的钉子,不是期望行为:渲染器按半角计宽,中文占 2 列却只算 1 列,
  // 于是含中文的行比框线宽出「该行中文字数」。上游若修正,这条会红——届时删掉本测试,
  // 并同步 SKILL.md 里 ascii 那条「中文标签的框线会错位」
  test('已知限制:中文行比框线宽出该行的中文字数', async () => {
    const box = sandbox();
    await runCli([fixture('cjk.mmd'), box.out, '--format', 'ascii'], { box });
    const rows = lines(read(join(box.out, 'cjk.txt')));
    const border = displayWidth(rows[0]);
    for (const row of rows) {
      const cjk = cjkCount(row);
      assert.equal(displayWidth(row), border + cjk, `行宽不符合「框宽 + 中文字数」: ${JSON.stringify(row)}`);
    }
  });

  test('中文与特殊字符混排:预览页里被转义,不注入 HTML', async () => {
    const box = sandbox();
    await runCli([fixture('cjk-special.mmd'), box.out, '--format', 'ascii', '--preview'], { box });
    const html = read(box.previewPath);
    assert.match(html, /&lt;call&gt;/);
    assert.match(html, /&amp;/);
    assert.doesNotMatch(html, /<call>/, '标签里的尖括号以裸 HTML 形式落进预览页');
  });
});
