// CLI 测试脚手架:每次调用建沙箱,隔离两件有副作用的事——
//   1. TMPDIR:--preview 写的 mermaid-preview.html 落进沙箱,不碰真实 tmp
//   2. open / xdg-open / start:换成只记调用的桩,测试期间不弹浏览器
import { spawn } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url)); // 仓库根
export const SCRIPT = join(ROOT, 'skills/mermaid-diagrams/tools/render-diagrams.mjs');
export const SKILL_MD = join(ROOT, 'skills/mermaid-diagrams/SKILL.md');
export const REPO_ROOT = ROOT;
export const FIXTURES = fileURLToPath(new URL('../fixtures', import.meta.url));
export const fixture = (name) => join(FIXTURES, name);

// 图类型 -> 夹具;与 SKILL.md 方法论第 1 条列的六种一一对应
export const TYPE_FIXTURES = {
  flowchart: 'flow.mmd',
  class: 'class.mmd',
  sequence: 'sequence.mmd',
  state: 'state.mmd',
  er: 'er.mmd',
  xychart: 'xychart.mmd',
};

export function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'mmd-test-'));
  const bin = join(root, 'bin');
  const tmp = join(root, 'tmp');
  const out = join(root, 'out');
  for (const d of [bin, tmp, out]) mkdirSync(d);
  const openLog = join(root, 'open.log');
  for (const name of ['open', 'xdg-open', 'start']) {
    const p = join(bin, name);
    writeFileSync(p, `#!/bin/sh\necho "$1" >> "${openLog}"\n`);
    chmodSync(p, 0o755);
  }
  const src = join(root, 'src');
  mkdirSync(src);
  return {
    root, bin, tmp, out, src, openLog,
    previewPath: join(tmp, 'mermaid-preview.html'),
    // 把夹具拷进沙箱源目录:目录批量只跑点名的那几张,输入输出都不碰仓库
    stage: (...names) => {
      for (const n of names) copyFileSync(fixture(n), join(src, n));
      return src;
    },
    opened: () => {
      try {
        return readFileSync(openLog, 'utf8').trim().split('\n').filter(Boolean);
      } catch {
        return [];
      }
    },
  };
}

// 跑一次 CLI。input 传了就从 stdin 喂给子进程;stdout 是管道,故 ascii 走 colorMode auto 的无色分支
export function runCli(args, { box, input } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, TMPDIR: box.tmp, PATH: `${box.bin}:${process.env.PATH}` },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input ?? '');
  });
}

export const read = (p) => readFileSync(p, 'utf8');

// 终端列宽:东亚全角算 2,零宽控制符算 0,其余算 1。
// 文本图是按列对齐的,所以「按列量」才有意义——文本图的渲染器目前按半角计宽,
// 中文标签会因此错位,测试要能量出这个差值
const ZERO_WIDTH = /[\u200b-\u200f\u2060\ufeff]/;
const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]|[\u{20000}-\u{2fa1f}]/u;
export const displayWidth = (s) => [...s].reduce((n, c) => n + (ZERO_WIDTH.test(c) ? 0 : WIDE.test(c) ? 2 : 1), 0);
export const cjkCount = (s) => [...s].filter((c) => WIDE.test(c)).length;

// 浏览器桩是 detached 子进程,调用记录要等它落盘;轮询到超时为止,结果交给断言判
export async function waitFor(fn, { timeout = 3000, interval = 25 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const v = fn();
    if (v || Date.now() > deadline) return v;
    await new Promise((r) => { setTimeout(r, interval); });
  }
}

// 源 .mmd 名 -> 期望产物名(目录批量 / 默认输出路径共用)
export const outName = (srcName, format) =>
  srcName.replace(/\.mmd$/, format === 'ascii' ? '.txt' : '.svg');
