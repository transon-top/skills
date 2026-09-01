#!/usr/bin/env node
// obsidian-kit 配置管理: ~/.claude/.obsidian-kit.json 的检测与更新
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const CONFIG_PATH = path.join(homedir(), '.claude', '.obsidian-kit.json');
const DEFAULT_INBOX = '10_inbox';

const USAGE = `用法: config.mjs <命令>

命令:
  check                                      校验配置, inbox 缺失时自动创建
  get                                        输出当前配置 JSON
  set --vault <名称> [--inbox <目录>] [--root <路径>]
                                             绑定/换绑, root 缺省时从 obsidian CLI 自动获取`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    if (!key.startsWith('--') || i + 1 >= argv.length) {
      console.error(`✗ 无法解析参数: ${argv.slice(i).join(' ')}`);
      process.exit(1);
    }
    args[key.slice(2)] = argv[i + 1];
  }
  return args;
}

function readConfig() {
  if (!existsSync(CONFIG_PATH)) return { error: `配置文件不存在: ${CONFIG_PATH}` };
  try {
    return { config: JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) };
  } catch {
    return { error: `配置文件不是合法 JSON: ${CONFIG_PATH}` };
  }
}

function resolveRoot(vault) {
  try {
    // info=path 时 CLI 直接输出纯路径
    return execFileSync('obsidian', [`vault=${vault}`, 'vault', 'info=path'], { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

function registeredVaults() {
  const out = execFileSync('obsidian', ['vaults'], { encoding: 'utf8' });
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

function runCheck() {
  const problems = [];
  const warnings = [];
  const fixes = [];

  const res = readConfig();
  if (res.error) {
    console.error(`✗ ${res.error}`);
    return 1;
  }
  const config = res.config;

  for (const field of ['vault', 'root', 'inbox']) {
    if (typeof config[field] !== 'string' || config[field] === '') problems.push(`缺少字段 ${field}`);
  }

  if (!problems.length) {
    try {
      if (!statSync(config.root).isDirectory()) problems.push(`root 不是目录: ${config.root}`);
    } catch {
      problems.push(`root 不存在: ${config.root}`);
    }
  }

  if (!problems.length) {
    const inboxDir = path.join(config.root, config.inbox);
    if (!existsSync(inboxDir)) {
      mkdirSync(inboxDir, { recursive: true });
      fixes.push(`已创建 inbox: ${inboxDir}`);
    }
    try {
      if (!registeredVaults().includes(config.vault)) {
        warnings.push(`vault "${config.vault}" 不在 obsidian vaults 列表中`);
      }
    } catch {
      warnings.push('obsidian CLI 不可达, 跳过 vault 注册检查');
    }
  }

  console.log(`配置: ${CONFIG_PATH}`);
  console.log(`  vault: ${config.vault}`);
  console.log(`  root:  ${config.root}`);
  console.log(`  inbox: ${config.inbox}`);
  for (const f of fixes) console.log(`✓ ${f}`);
  for (const w of warnings) console.log(`⚠ ${w}`);
  if (problems.length) {
    for (const p of problems) console.error(`✗ ${p}`);
    return 1;
  }
  console.log('✓ 配置有效');
  return 0;
}

function runGet() {
  const res = readConfig();
  if (res.error) {
    console.error(`✗ ${res.error}`);
    return 1;
  }
  console.log(JSON.stringify(res.config, null, 2));
  return 0;
}

function runSet(argv) {
  const args = parseArgs(argv);
  if (!args.vault) {
    console.error('✗ 缺少 --vault <名称>');
    console.error(USAGE);
    return 1;
  }

  let root = args.root;
  if (!root) {
    root = resolveRoot(args.vault);
    if (!root) {
      console.error(`✗ 无法从 obsidian CLI 获取 "${args.vault}" 的路径, 请用 --root 手动指定`);
      return 1;
    }
  }
  try {
    if (!statSync(root).isDirectory()) {
      console.error(`✗ root 不是目录: ${root}`);
      return 1;
    }
  } catch {
    console.error(`✗ root 不存在: ${root}`);
    return 1;
  }

  const config = { vault: args.vault, root, inbox: args.inbox ?? DEFAULT_INBOX };
  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
  console.log(`✓ 已写入 ${CONFIG_PATH}`);
  return runCheck();
}

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case 'check':
    process.exit(runCheck());
    break;
  case 'get':
    process.exit(runGet());
    break;
  case 'set':
    process.exit(runSet(rest));
    break;
  default:
    console.error(USAGE);
    process.exit(cmd === undefined || cmd === '' ? 0 : 1);
}
