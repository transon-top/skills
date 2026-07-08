---
name: commit
disable-model-invocation: true
argument-hint: '[--no-verify] [--style=simple|full] [--type=<type>]'
description: 创建约定式提交
---

# /commit

创建遵循 Conventional Commits 规范的 git commit。

## 选项

- `--no-verify`：跳过预提交检查
- `--style=simple|full`：simple（默认）= 单行；full = 正文+页脚
- `--type=<type>`：强制指定类型，覆盖自动检测

## 流程

### 1. 发现检查命令（除非 `--no-verify`）

自动探测项目可用的代码检查命令：

**探测方式：**

- 读取 `package.json` 的 `scripts` 字段，匹配以下模式：
  - 类型检查：`typecheck`、`type-check`、`ts:check`、`check:types`、`tsc`
  - 代码质量：`lint`、`lint:check`、`eslint`、`biome:lint`
  - 格式化：`format`、`format:check`、`prettier`、`prettier:check`、`biome:format`

**回退：**

- 如 `package.json` 不存在或不含匹配的脚本，检查配置文件（`tsconfig.json`、`.eslintrc.*`、`eslint.config.*`、`biome.json`、`.prettierrc*`）推断工具链，用对应工具的原生检查命令（如 `npx tsc --noEmit`、`npx eslint .`、`npx prettier --check .`）

**完成标准：** 列出所有发现的命令，展示给用户确认后依次执行。任一步失败即停止，输出错误信息，不继续后续步骤。

### 2. 分析变更

对当前分支所有未提交变更执行 `git diff`：

- 自动识别提交类型（feat/fix/docs/…），或使用 `--type` 强制指定
- 自动提取 scope（影响的模块/目录）
- 检测拆分信号，出现任一情况则建议拆分为多个提交：
  - 混合类型（feat + fix 同时出现）
  - 跨多个不相关模块
  - 源码 + 测试 + 文档混合
  - 依赖更新与功能代码混合

**完成标准：** 类型和 scope 已确定；如检测到拆分信号，列出建议分组，等待用户确认是拆分还是一并提交。

### 3. 生成并确认

按 `--style` 生成提交信息，展示给用户确认后执行 `git commit`。

## 提交格式

**Simple（默认）：**

```
<emoji> <type>[scope]: <描述>
```

- `<描述>`：现在时、≤50 字符、首字母大写、不加句号

**Full（`--style=full`）：**

```
<emoji> <type>[scope]: <描述>

<正文>

<页脚>
```

- 正文：解释「改了什么」和「为什么」，项目符号列举，每行 ≤72 字符
- 页脚：`BREAKING CHANGE:` / `Closes: #123` / `Co-authored-by:`
- Full 自动触发：破坏性变更、复杂功能、跨系统变更

## 类型映射

| 类型     | Emoji | 用途     |
| -------- | ----- | -------- |
| feat     | ✨    | 新功能   |
| fix      | 🐛    | Bug 修复 |
| docs     | 📝    | 文档     |
| style    | 🎨    | 格式     |
| refactor | ♻️    | 重构     |
| perf     | ⚡️    | 性能     |
| test     | ✅    | 测试     |
| chore    | 🔧    | 维护     |
| ci       | 👷    | CI/CD    |
| build    | 📦    | 构建     |
| revert   | ⏪    | 回退     |

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
