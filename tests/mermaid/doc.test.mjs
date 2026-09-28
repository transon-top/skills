// 层 2:SKILL.md 与脚本的契约
// 文档说的,脚本要真做;脚本做的,文档要写明。任一侧改动而另一侧没跟,这里红
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { FIXTURES, SCRIPT, SKILL_MD, read } from './lib/harness.mjs';

const md = read(SKILL_MD);
const script = read(SCRIPT);
const frontmatter = md.split(/^---$/m)[1] ?? '';
const body = md.replace(/^---[\s\S]*?^---$/m, '');
const usageBlock = (md.match(/```sh\n([\s\S]*?)```/) ?? [, ''])[1];

// 正文方法论各条加粗标题,如「2. **拆图:总览 + 展开**」
const ruleTitles = [...body.matchAll(/^\d+\. \*\*(.+?)\*\*/gm)].map((m) => m[1]);
const flagsIn = (text) => new Set([...text.matchAll(/--[a-z][a-z-]*/g)].map((m) => m[0]));

describe('frontmatter', () => {
  test('name 与 description 齐备', () => {
    assert.match(frontmatter, /name: mermaid-diagrams/);
    assert.match(frontmatter, /description: \S+/);
  });

  test('描述里的索引词与正文方法论同词', () => {
    assert.ok(ruleTitles.length >= 4, `方法论条目解析异常: ${JSON.stringify(ruleTitles)}`);
    for (const title of ruleTitles) {
      const head = title.split(/[:：(]/)[0].trim();
      assert.ok(frontmatter.includes(head), `描述缺索引词「${head}」`);
    }
    assert.match(frontmatter, /总览/);
    assert.match(frontmatter, /展开/);
  });
});

describe('拆图规则', () => {
  test('写的是通用的总览 + 展开,不是心智模型那套说法', () => {
    const rule = body.match(/^\d+\. \*\*拆图.*$/m)?.[0] ?? '';
    assert.ok(rule, '找不到拆图规则');
    assert.match(rule, /总览/);
    assert.match(rule, /展开/);
    assert.match(rule, /同名/, '必须写清子图首节点与总览同名');
    assert.doesNotMatch(rule, /心智模型/);
  });

  test('图组命名与相邻约定还在', () => {
    const rule = body.match(/^\d+\. \*\*拆图.*$/m)?.[0] ?? '';
    assert.match(rule, /-1/);
    assert.match(rule, /-2/);
  });

  test('全篇不设节点数上限', () => {
    for (const [tag, text] of [['SKILL.md', md], ['frontmatter', frontmatter]]) {
      assert.doesNotMatch(text, /节点上限/, `${tag} 残留节点上限说法`);
    }
    assert.doesNotMatch(frontmatter, /拆图组/, '描述里还有旧索引词「拆图组」');
  });
});

describe('图类型', () => {
  test('正文列出的六种图类型各有夹具', () => {
    const rule = body.match(/^\d+\. \*\*图类型选择\*\*.*$/m)?.[0] ?? '';
    for (const type of ['flowchart', 'class', 'sequence', 'state', 'ER', 'xychart']) {
      assert.ok(rule.includes(type), `正文缺图类型 ${type}`);
    }
    for (const file of ['flow.mmd', 'class.mmd', 'sequence.mmd', 'state.mmd', 'er.mmd', 'xychart.mmd']) {
      assert.ok(existsSync(join(FIXTURES, file)), `缺夹具 ${file}`);
    }
  });
});

describe('文档与脚本的漂移', () => {
  test('渲染脚本段写到的 flag 与脚本支持的完全一致', () => {
    // 只比渲染脚本那一节:--mode 是技能级参数,不是渲染器参数,归下面那条测试管
    const section = body.split(/^## /m).find((s) => s.startsWith('渲染脚本')) ?? '';
    const docFlags = flagsIn(section);
    const scriptFlags = flagsIn(script.match(/const USAGE = `([\s\S]*?)`;/)?.[1] ?? '');
    assert.deepEqual([...docFlags].sort(), [...scriptFlags].sort());
  });

  test('技能级参数 --mode 在元信息与正文里是同一套取值', () => {
    assert.match(frontmatter, /argument-hint: .*--mode lite\|full/, '元信息没声明 --mode');
    const rule = body.match(/^\d+\. \*\*绘制模式\*\*.*$/m)?.[0] ?? '';
    assert.ok(rule, '找不到绘制模式规则');
    assert.match(rule, /`lite`/);
    assert.match(rule, /`full`/);
    assert.match(rule, /--mode lite\|full/, '正文没写调用时的参数写法');
  });

  test('三种输入方式都写着', () => {
    for (const token of ['srcDir', 'file.mmd', '-']) {
      assert.ok(usageBlock.includes(token), `用法块缺 ${token}`);
    }
  });

  test('默认值三方对齐:格式、主题、预览路径', () => {
    assert.match(body, /默认 `svg`/, '文档没写默认格式');
    assert.match(script, /let format = 'svg'/);
    assert.match(body, /默认 `github-light`/);
    assert.match(script, /'github-light'/);
    assert.match(body, /<tmpdir>\/mermaid-preview\.html/);
    assert.match(script, /'mermaid-preview\.html'/);
  });

  test('ascii 的已知限制仍写着', () => {
    assert.match(body, /asiic|ascii/);
    assert.match(body, /错位/, '中文标签在 ascii 下错位这一限制必须留在文档里');
    assert.match(script, /renderMermaidASCII/);
  });
});
