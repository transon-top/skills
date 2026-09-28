// 层 3 判定器的自测:喂合成图组,确认它夸该夸的、抓该抓的
// 判定器本身跑不了模型,这里把它的正反例钉死,免得松到全过或严到全挂
import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { checkDir, checkGroup, nodes } from './check-artifacts.mjs';

function stage(files, withArtifacts = true) {
  const dir = mkdtempSync(join(tmpdir(), 'mmd-eval-'));
  for (const [name, src] of Object.entries(files)) {
    writeFileSync(join(dir, name), src);
    if (withArtifacts) writeFileSync(join(dir, name.replace(/\.mmd$/, '.svg')), '<svg/>');
  }
  return dir;
}

const verdict = (results) => results.flatMap((r) => r.checks).every((c) => c.ok);
const failures = (results) => results.flatMap((r) => r.checks.filter((c) => !c.ok).map((c) => c.label));

const GOOD = {
  'pipe-1.mmd': 'graph TD\n  AA[采集] --> BB[清洗]\n  BB --> CC[入库]\n',
  'pipe-2.mmd': 'graph TD\n  AA --> A1[读源]\n  A1 --> A2[分片]\n',
  'pipe-3.mmd': 'graph TD\n  BB --> B1[去重]\n  B1 --> B2[补全]\n',
  'pipe-4.mmd': 'graph TD\n  CC --> C1[批量写]\n  C1 --> C2[校验]\n',
};

describe('节点抽取', () => {
  test('flowchart 认出带形状的节点与标签', () => {
    const got = nodes('graph TD\n  AA[采集] --> BB(清洗)\n');
    assert.deepEqual(got.map((n) => n.id), ['AA', 'BB']);
    assert.deepEqual(got.map((n) => n.label), ['采集', '清洗']);
  });

  test('sequence 认参与者,不把消息当节点', () => {
    const got = nodes('sequenceDiagram\n  User->>API: 提问\n  API-->>User: 回答\n');
    assert.deepEqual(got.map((n) => n.id), ['User', 'API']);
  });

  test('class 认类名,方法体不算节点', () => {
    const got = nodes('classDiagram\n  class Agent {\n    +run()\n  }\n  Agent --> Tool\n');
    assert.ok(got.some((n) => n.id === 'Agent'));
    assert.ok(!got.some((n) => n.id.includes('run')));
  });

  test('er 认两端实体,关系名不算节点', () => {
    const got = nodes('erDiagram\n  USER ||--o{ ORDER : places\n');
    assert.deepEqual(got.map((n) => n.id), ['USER', 'ORDER']);
  });

  test('state 认状态,起始符不算节点', () => {
    const got = nodes('stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running: start\n');
    assert.deepEqual(got.map((n) => n.id), ['Idle', 'Running']);
  });

  test('xychart 无节点语义', () => {
    assert.deepEqual(nodes('xychart-beta\n  x-axis [Q1, Q2]\n  bar [1, 2]\n'), []);
  });
});

describe('合格的图组', () => {
  test('总览 + 三个同名展开子图:全过', () => {
    const results = checkDir(stage(GOOD), { requireExpansion: true, expectGroups: 1 });
    assert.ok(verdict(results), `不该红: ${failures(results).join(' / ')}`);
    assert.ok(results.find((r) => r.name === 'pipe').expanded);
  });
});

describe('判定器抓得住的毛病', () => {
  test('子图首节点不在总览里', () => {
    const bad = { ...GOOD, 'pipe-2.mmd': 'graph TD\n  ZZ --> A1[读源]\n' };
    const fails = failures(checkDir(stage(bad)));
    assert.ok(fails.some((l) => l.includes('首节点在总览里')), fails.join(' / '));
  });

  test('两张子图展开同一个节点', () => {
    const bad = { ...GOOD, 'pipe-3.mmd': 'graph TD\n  AA --> B1[去重]\n' };
    const fails = failures(checkDir(stage(bad)));
    assert.ok(fails.some((l) => l.includes('展开不同节点')), fails.join(' / '));
  });

  test('总览比子图还大,不算骨架', () => {
    const bad = {
      'big-1.mmd': 'graph TD\n  A --> B\n  B --> C\n  C --> D\n  D --> E\n',
      'big-2.mmd': 'graph TD\n  A --> A1\n',
    };
    const fails = failures(checkDir(stage(bad)));
    assert.ok(fails.some((l) => l.includes('总览是骨架')), fails.join(' / '));
  });

  test('编号缺号', () => {
    const bad = { 'g-1.mmd': GOOD['pipe-1.mmd'], 'g-3.mmd': GOOD['pipe-2.mmd'] };
    const fails = failures(checkDir(stage(bad)));
    assert.ok(fails.some((l) => l.includes('编号连续')), fails.join(' / '));
  });

  test('标签带省略号', () => {
    const bad = { 'e-1.mmd': 'graph TD\n  A[很长的标签...] --> B[短]\n' };
    const fails = failures(checkDir(stage(bad)));
    assert.ok(fails.some((l) => l.includes('无省略号')), fails.join(' / '));
  });

  test('缺产物文件', () => {
    const fails = failures(checkDir(stage(GOOD, false)));
    assert.ok(fails.some((l) => l.includes('有产物')), fails.join(' / '));
  });

  test('要求展开却只有一张图', () => {
    const flat = { 'solo.mmd': 'graph TD\n  A --> B\n' };
    const fails = failures(checkDir(stage(flat), { requireExpansion: true }));
    assert.ok(fails.some((l) => l.includes('总览 + 展开')), fails.join(' / '));
  });

  test('格式要求对不上:要 .txt 却只出了 .svg', () => {
    const fails = failures(checkDir(stage(GOOD), { expectExt: '.txt' }));
    assert.ok(fails.some((l) => l.includes('有产物')), fails.join(' / '));
  });

  test('组数不够', () => {
    const fails = failures(checkDir(stage(GOOD), { expectGroups: 3 }));
    assert.ok(fails.some((l) => l.includes('图组数')), fails.join(' / '));
  });
});

describe('单组直接判定', () => {
  test('没有子图时只查编号与省略号', () => {
    const dir = stage({ 'one-1.mmd': 'graph TD\n  A --> B\n' });
    const group = checkGroup('one', [{ path: join(dir, 'one-1.mmd'), n: 1 }]);
    assert.equal(group.expanded, false);
    assert.ok(group.checks.every((c) => c.ok));
    assert.ok(!group.checks.some((c) => c.label.includes('总览')));
  });
});

describe('目录扫描', () => {
  test('子目录里的图源也算进来', () => {
    const dir = stage(GOOD);
    mkdirSync(join(dir, 'nested'));
    writeFileSync(join(dir, 'nested/deep-1.mmd'), 'graph TD\n  A --> B\n');
    writeFileSync(join(dir, 'nested/deep.svg'), '<svg/>');
    const names = checkDir(dir).map((r) => r.name);
    assert.ok(names.includes('deep'), names.join(','));
  });
});

describe('lite 模式的判定', () => {
  test('单图组通过 --no-expansion', () => {
    const flat = { 'solo.mmd': 'graph TD\n  A --> B\n' };
    const fails = failures(checkDir(stage(flat), { noExpansion: true }));
    assert.deepEqual(fails, []);
  });

  test('拆了子图就不算 lite', () => {
    const fails = failures(checkDir(stage(GOOD), { noExpansion: true }));
    assert.ok(fails.some((l) => l.includes('lite')), fails.join(' / '));
  });
});
