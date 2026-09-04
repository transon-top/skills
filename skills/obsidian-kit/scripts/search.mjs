#!/usr/bin/env node
// obsidian-kit 只读搜索封装: 全部子命令对 vault 零写入, 仅用于检索与参考查看
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const CONFIG_PATH = path.join(homedir(), '.claude', '.obsidian-kit.json');
const DEFAULT_LIMIT = 10;
const MAX_LINES_PER_FILE = 3;
// CLI 白名单: 只读子命令, 白名单外任何调用拒绝执行
const ALLOWED_CLI = new Set(['search', 'search:context', 'read', 'tags', 'tag', 'properties', 'property:read', 'vault']);

const USAGE = `用法: search.mjs <命令> [args]

只读封装: 不做任何写入, 仅检索与查看.

命令:
  check                          纯只读配置校验 (不创建目录/不写文件)
  context <query> [--limit <n>] [--path <文件夹>] [--vault <名称>]
                                 全文搜索, 输出 路径+行号+文本 清单 (每文件 ≤3 行)
  tags [--vault <名称>]          列出全库 tags
  tag <名称> [--vault <名称>]    列出某 tag 的文件清单
  properties <file> [--vault <名称>]
                                 读文件 frontmatter (yaml 原文)
  read <file> [--vault <名称>]   读文件全文`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      if (i + 1 >= argv.length) {
        console.error(`✗ 无法解析参数: ${argv.slice(i).join(' ')}`);
        process.exit(1);
      }
      args[argv[i].slice(2)] = argv[i + 1];
      i += 1;
    } else if (!args._) {
      args._ = [argv[i]];
    } else {
      args._.push(argv[i]);
    }
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

// 校验: 纯读取, 任何情况不写文件/目录
function runCheck() {
  const res = readConfig();
  if (res.error) {
    console.error(`✗ ${res.error} (先运行 /obsidian-kit config 绑定)`);
    return 1;
  }
  const { config } = res;
  for (const field of ['vault', 'root', 'inbox']) {
    if (typeof config[field] !== 'string' || config[field] === '') {
      console.error(`✗ 缺少字段 ${field}`);
      return 1;
    }
  }
  try {
    if (!statSync(config.root).isDirectory()) {
      console.error(`✗ root 不是目录: ${config.root}`);
      return 1;
    }
  } catch {
    console.error(`✗ root 不存在: ${config.root}`);
    return 1;
  }
  try {
    execFileSync('obsidian', ['version'], { encoding: 'utf8' });
  } catch {
    console.error('✗ obsidian CLI 不可达, 请先安装 (技能前提)');
    return 1;
  }
  console.log(`✓ 只读校验通过: vault=${config.vault} root=${config.root}`);
  return 0;
}

// 统一入口: 白名单内只读命令 + vault 注入
function cli(vault, cliCmd, opts = {}) {
  if (!ALLOWED_CLI.has(cliCmd)) {
    console.error(`✗ 白名单外命令被拒绝: ${cliCmd}`);
    process.exit(1);
  }
  const argv = [];
  if (vault) argv.push(`vault=${vault}`);
  argv.push(cliCmd);
  for (const [k, v] of Object.entries(opts)) {
    if (v !== undefined) argv.push(`${k}=${v}`);
  }
  return execFileSync('obsidian', argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// context: 全文搜索 + 格式化清单 (每文件 ≤3 命中行, 其余折叠)
function runContext(vault, query, limit, folder) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    console.error('✗ 缺少 --q <query>, 搜索词为空');
    return 1;
  }
  const raw = cli(vault, 'search:context', {
    query: query.trim(),
    ...(limit ? { limit: Number(limit) } : { limit: DEFAULT_LIMIT }),
    ...(folder ? { path: folder } : {}),
    format: 'json',
  });
  let rows;
  try {
    rows = JSON.parse(raw);
  } catch {
    // CLI 无命中时输出 "No matches found." (非 JSON)
    if (/no matches/i.test(raw)) {
      console.log(`✓ 未找到匹配 ${query.trim()} 的文档`);
      return 0;
    }
    console.error(raw.trim() || '✗ search:context 输出无法解析');
    return 1;
  }
  if (!rows.length) {
    console.log(`✓ 未找到匹配 ${query.trim()} 的文档`);
    return 0;
  }
  console.log(`找到 ${rows.length} 个文件 (查询词: ${query.trim()}):`);
  for (const row of rows) {
    console.log(`\n📄 ${row.file}`);
    // 同一行命中多次时 CLI 会重复输出, 按行号去重
    const seen = new Set();
    const lines = (row.matches || []).filter((m) => {
      if (seen.has(m.line)) return false;
      seen.add(m.line);
      return true;
    });
    for (const m of lines.slice(0, MAX_LINES_PER_FILE)) {
      console.log(`  ${m.line}: ${m.text}`);
    }
    const rest = lines.length - MAX_LINES_PER_FILE;
    if (rest > 0) console.log(`  … 另 ${rest} 处匹配`);
  }
  return 0;
}

function runTags(vault) {
  const out = cli(vault, 'tags').trim();
  console.log(out || '✓ 无 tags');
  return 0;
}

function runTag(vault, name) {
  if (!name) {
    console.error('✗ 缺少 tag 名称, 用法: tag <名称>');
    return 1;
  }
  const out = cli(vault, 'tag', { name, verbose: '' }).trim();
  if (/not found/i.test(out)) {
    console.log(`✓ tag "${name}" 不存在`);
    return 0;
  }
  if (!out) {
    console.log(`✓ tag "${name}" 无关联文件`);
    return 0;
  }
  const lines = out.split('\n');
  console.log(lines[0]); // #tag<TAB>count
  for (const f of lines.slice(1)) console.log(`  ${f}`);
  return 0;
}

// 读文件: CLI 优先, CLI 失败时 fallback 直接读 <root>/<相对路径>
function readFileText(vault, file, config) {
  let cliErr = null;
  try {
    const out = cli(vault, 'read', { path: file });
    if (!out.trim().startsWith('Error:')) return out;
    cliErr = out.trim();
  } catch (e) {
    cliErr = String(e.stderr || e.message).trim();
  }
  const root = config?.root;
  if (root) {
    try {
      return readFileSync(path.join(root, file), 'utf8');
    } catch {
      // fallthrough: 报 CLI 错误
    }
  }
  throw new Error(`${file} 读取失败: ${cliErr}`);
}

// fallback 读文件需 root, 从 config 取
let configCache = null;
function loadConfig() {
  if (configCache) return configCache;
  const res = readConfig();
  configCache = res.config;
  return configCache;
}

function runProperties(vault, file) {
  if (!file) {
    console.error('✗ 缺少 <file>, 用法: properties <file>');
    return 1;
  }
  try {
    const out = cli(vault, 'properties', { path: file, format: 'yaml' }).trim();
    if (!out || /no frontmatter/i.test(out)) {
      console.log('(无 frontmatter)');
      return 0;
    }
    if (out.startsWith('Error:')) {
      console.error(`✗ ${out}`);
      return 1;
    }
    console.log(out);
    return 0;
  } catch (e) {
    console.error(`✗ ${file} 读取失败: ${String(e.stderr || e.message).trim()}`);
    return 1;
  }
}

function runRead(vault, file) {
  if (!file) {
    console.error('✗ 缺少 <file>, 用法: read <file>');
    return 1;
  }
  try {
    console.log(readFileText(vault, file, loadConfig()));
    return 0;
  } catch (e) {
    console.error(`✗ ${e.message}`);
    return 1;
  }
}

const [cmd, ...rest] = process.argv.slice(2);
let result = null;
switch (cmd) {
  case 'check':
    result = runCheck();
    break;
  case 'context': {
    const args = parseArgs(rest);
    const cfg = loadConfig();
    const vault = args.vault ?? cfg?.vault;
    result = runContext(vault, args._?.[0], args.limit, args.path);
    break;
  }
  case 'tags': {
    const args = parseArgs(rest);
    const cfg = loadConfig();
    const vault = args.vault ?? cfg?.vault;
    result = runTags(vault);
    break;
  }
  case 'tag': {
    const args = parseArgs(rest);
    const cfg = loadConfig();
    const vault = args.vault ?? cfg?.vault;
    result = runTag(vault, args._?.[0]);
    break;
  }
  case 'properties': {
    const args = parseArgs(rest);
    const cfg = loadConfig();
    const vault = args.vault ?? cfg?.vault;
    result = runProperties(vault, args._?.[0]);
    break;
  }
  case 'read': {
    const args = parseArgs(rest);
    const cfg = loadConfig();
    const vault = args.vault ?? cfg?.vault;
    result = runRead(vault, args._?.[0]);
    break;
  }
  default:
    console.error(USAGE);
    result = cmd === undefined || cmd === '' ? 0 : 1;
}
process.exit(result ?? 0);
