// 层 3 驱动:每条场景开一个干净工作目录,让带技能的子代理跑一遍,再用判定器按 SKILL.md 打分
//
// 用法:
//   node run.mjs                 # 跑全部场景
//   node run.mjs S3-长流程拆图    # 只跑一条
//   node run.mjs --dry-run       # 只打印将要执行的命令与判定项,不调模型
//   node run.mjs --keep          # 保留工作目录(默认跑完留在系统临时目录里,便于复查)
//
// 前置:claude CLI 可用;~/.claude/skills 下的 mermaid-diagrams 是本仓库的最新副本
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const MROOT = join(EVAL_DIR, '..');
const FIXTURES = join(MROOT, 'fixtures');
const CHECKER = join(EVAL_DIR, 'check-artifacts.mjs');
const SKILL_TOOLS = join(MROOT, '../../skills/mermaid-diagrams/tools');
const SCENARIOS = JSON.parse(readFileSync(join(EVAL_DIR, 'scenarios.json'), 'utf8'));

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const keep = argv.includes('--keep');
const only = argv.filter((a) => !a.startsWith('--'));

const run = (cmd, args, opts = {}) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('close', (code) => resolve(code ?? 1));
  });

const capture = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return (r.stdout ?? '').trim();
};

// 主题键从脚本依赖里现取,免得场景里写死一份
const themeKeys = () =>
  capture(process.execPath, ['-e', 'import("beautiful-mermaid").then((m) => console.log(Object.keys(m.THEMES).join(" ")))'], { cwd: SKILL_TOOLS })
    .split(/\s+/)
    .filter(Boolean);

function buildArtifactArgs(dir, artifacts = {}) {
  const args = [CHECKER, dir];
  if (artifacts.requireExpansion) args.push('--require-expansion');
  if (artifacts.noExpansion) args.push('--no-expansion');
  if (artifacts.expectGroups) args.push('--expect-groups', String(artifacts.expectGroups));
  if (artifacts.expectExt) args.push('--expect-ext', artifacts.expectExt);
  return args;
}

function transcriptChecks(transcript, scenario, keys) {
  const out = [];
  if (scenario.transcriptMatch) {
    out.push([new RegExp(scenario.transcriptMatch).test(transcript), `转述里要提到 /${scenario.transcriptMatch}/`]);
  }
  if (scenario.transcriptMustNotMatch) {
    out.push([!new RegExp(scenario.transcriptMustNotMatch).test(transcript), `转述里不该出现 /${scenario.transcriptMustNotMatch}/`]);
  }
  if (scenario.themesAtMost) {
    const used = [...new Set(keys.filter((k) => transcript.includes(k)))];
    out.push([used.length <= scenario.themesAtMost, `主题数 <= ${scenario.themesAtMost}(实际 ${used.join(',') || '无'})`]);
  }
  return out;
}

const keys = dryRun ? [] : themeKeys();
const picked = only.length ? SCENARIOS.filter((s) => only.includes(s.id)) : SCENARIOS;
if (!picked.length) {
  console.error(`没有匹配的场景。可用: ${SCENARIOS.map((s) => s.id).join(' / ')}`);
  process.exit(2);
}

const root = mkdtempSync(join(tmpdir(), 'mmd-eval-'));
let failures = 0;

for (const scenario of picked) {
  const work = join(root, scenario.id);
  mkdirSync(work, { recursive: true });
  for (const f of scenario.setup) copyFileSync(join(FIXTURES, f), join(work, f));

  console.log(`\n=== ${scenario.id} — ${scenario.rule}`);
  console.log(`prompt: ${scenario.prompt}`);
  if (dryRun) {
    console.log(`将执行: claude -p <prompt>   (cwd: ${work})`);
    for (const alt of scenario.either ?? [scenario]) {
      if (alt.artifacts) console.log(`判定: ${buildArtifactArgs(work, alt.artifacts).slice(1).join(' ')}`);
      if (alt.transcriptMatch) console.log(`判定: 转述含 /${alt.transcriptMatch}/`);
    }
    continue;
  }

  // 转述同时进终端与文件:人看得见过程,判定器读得到文本
  const transcriptPath = join(work, 'transcript.txt');
  const chunks = [];
  await new Promise((resolve) => {
    const child = spawn('claude', ['-p', scenario.prompt, '--permission-mode', 'acceptEdits'], { cwd: work });
    const tee = (d) => { process.stdout.write(d); chunks.push(d); };
    child.stdout.on('data', tee);
    child.stderr.on('data', tee);
    child.on('close', resolve);
  });
  const transcript = Buffer.concat(chunks).toString('utf8');
  writeFileSync(transcriptPath, transcript);

  const results = [];
  for (const alt of scenario.either ?? [scenario]) {
    if (alt.artifacts) {
      const checkCode = await run(process.execPath, buildArtifactArgs(work, alt.artifacts), { cwd: work });
      results.push([checkCode === 0, `产物判定 ${JSON.stringify(alt.artifacts)}`]);
    }
    if (alt.transcriptMatch) {
      results.push([new RegExp(alt.transcriptMatch).test(transcript), `转述含 /${alt.transcriptMatch}/`]);
    }
  }
  if (scenario.either) {
    const anyPass = results.some(([ok]) => ok);
    console.log(`${anyPass ? '✔' : '✖'} ${scenario.id}(二选一)`);
    if (!anyPass) failures += 1;
    continue;
  }
  results.push(...transcriptChecks(transcript, scenario, keys));
  for (const [ok, label] of results) {
    if (!ok) failures += 1;
    console.log(`  ${ok ? '✔' : '✖'} ${label}`);
  }
}

console.log(`\n工作目录: ${root}${keep ? '' : '(判定器已读,可随时删)'}`);
console.log(failures ? `FAIL — ${failures} 项不合格` : 'PASS — 全部合格');
process.exit(failures ? 1 : 0);
