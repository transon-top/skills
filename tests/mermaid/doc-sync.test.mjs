// 层 2b:跨文件一致性——同一条规则只应有一个定义处
// 别的技能若把 mermaid-diagrams 的规则抄了一份,两处迟早分叉;这里把副本钉出来
import { strict as assert } from 'node:assert';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, test } from 'node:test';
import { REPO_ROOT, SKILL_MD } from './lib/harness.mjs';

const SKIP_DIRS = new Set(['node_modules', '.git', 'tests', 'dist']);

function markdownFiles(dir = REPO_ROOT) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...markdownFiles(join(dir, entry.name)));
    } else if (entry.name.endsWith('.md')) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

// 返回「文件:行号」列表,报错时直接定位
function hits(needle) {
  const found = [];
  for (const file of markdownFiles()) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.includes(needle)) found.push(`${relative(REPO_ROOT, file)}:${i + 1}`);
    });
  }
  return found;
}

describe('规则副本', () => {
  test('节点数上限只在历史里,不再出现在任何技能文档', () => {
    const found = hits('节点上限').filter((h) => !h.startsWith(relative(REPO_ROOT, SKILL_MD)));
    assert.deepEqual(found, [], `这些文件仍带着旧的节点上限规则:\n  ${found.join('\n  ')}`);
  });

  test('README 技能表用拆图那套词,不用旧词', () => {
    const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');
    const row = readme.split('\n').find((l) => l.includes('mermaid-diagrams')) ?? '';
    assert.ok(row, 'README 技能表缺 mermaid-diagrams 行');
    assert.match(row, /拆图/, 'README 行没跟上拆图说法');
    assert.doesNotMatch(row, /节点上限/);
  });
});

describe('指针不断', () => {
  test('anatomy-course 指向的渲染脚本仍在', () => {
    const other = join(REPO_ROOT, 'skills/anatomy-course/SKILL.md');
    if (!existsSync(other)) return; // 该技能未安装时跳过
    const text = readFileSync(other, 'utf8');
    assert.match(text, /mermaid-diagrams/, 'anatomy-course 未指向 mermaid-diagrams');
    assert.ok(
      existsSync(join(REPO_ROOT, 'skills/mermaid-diagrams/tools/render-diagrams.mjs')),
      'anatomy-course 依赖的渲染脚本不存在',
    );
  });
});
