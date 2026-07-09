---
name: commit
argument-hint: '[--no-verify] [--style=simple|full] [--type=<type>]'
description: 创建约定式提交，自动发现检查命令、分析变更、生成并执行提交
disable-model-invocation: true
---

# /commit

创建遵循 Conventional Commits 规范的 git commit。

## 选项

- `--no-verify`：跳过预提交检查
- `--style=simple|full`：full（默认）= 正文+页脚；simple = 单行
- `--type=<type>`：强制指定类型，覆盖自动检测

## 流程

### 1. 发现并执行检查（除非 `--no-verify`）

读取 `package.json` 的 `scripts`，按脚本名语义匹配三类检查命令，每类取首个命中项：

| 类型 | 匹配的脚本名 |
| ------ | ------------- |
| 类型检查 | `typecheck`, `type-check`, `check:types`, `ts:check`, `tsc`, `types`, `type`, `ts`, `validate-types` |
| 代码质量 | `lint`, `lint:check`, `lint:ci`, `eslint`, `lint-staged`, `lint:fix`, `check:lint`, `quality` |
| 格式化 | `format`, `fmt`, `format:check`, `format:write`, `prettier`, `pretty`, `fmt:check`, `check:format`, `beautify` |

名称未命中时，查阅 [`references/check-command-discovery.md`](references/check-command-discovery.md) 执行命令内容分析、配置文件回退及合并命令扫描。

简要列出找到的命令（标注来源），然后直接执行：

- 格式化始终执行写入（`--write`）
- 类型检查和代码质量使用只读检查
- 执行顺序：类型检查 → 代码质量 → 格式化
- 任一步失败即停止，报告错误

### 2. 分析变更

对未提交变更执行 `git diff`：

- 自动识别提交类型，`--type` 强制覆盖
- 自动提取 scope
- 拆分信号（混合类型/跨模块/源码+测试+文档混合/依赖与功能混合）出现时简要标注，仍合并提交

**完成标准：** 类型和 scope 已确定，描述 ≤50 字符。

### 3. 生成并提交

按 `--style` 生成提交信息，直接执行 `git commit`，不展示确认。

## 提交格式

**Full（默认）：**

```text
<emoji> <type>[scope]: <描述>

<正文>

<页脚>
```

- 正文：解释「改了什么」和「为什么」，项目符号列举，每行 ≤72 字符
- 页脚：`BREAKING CHANGE:` / `Closes: #123` / `Co-authored-by:`

**Simple（`--style=simple`）：**

```text
<emoji> <type>[scope]: <描述>
```

- `<描述>`：现在时、≤50 字符、首字母大写、不加句号

## 类型映射

| 类型 | Emoji | 用途 |
| ------ | ------- | ------ |
| feat | ✨ | 新功能 |
| fix | 🐛 | Bug 修复 |
| docs | 📝 | 文档 |
| style | 🎨 | 格式 |
| refactor | ♻️ | 重构 |
| perf | ⚡️ | 性能 |
| test | ✅ | 测试 |
| chore | 🔧 | 维护 |
| ci | 👷 | CI/CD |
| build | 📦 | 构建 |
| revert | ⏪ | 回退 |

## 示例

```bash
# Simple
✨ feat(auth): 添加 JWT 令牌验证
🐛 fix: 解决事件处理程序内存泄漏

# Full
✨ feat(auth): 实现 OAuth2 认证流程

添加支持多提供商（Google、GitHub）的 OAuth2 系统：
- 带 PKCE 的授权码流程
- 刷新令牌轮换
- 基于范围的权限

BREAKING CHANGE: /api/auth 端点现在需要 client_id
Closes: #456
```
