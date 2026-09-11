# react-doctor

对应要点 6。把规则摆到模型生成时面前——可作项目扫描，也可**装成 agent skill** 让它在写代码时就能看到问题。

**仅 React 项目。** 自述："Your agent writes bad React. This catches it"。

## 版本兼容

它把 `typescript` 当**普通依赖**自带一份，不是 peer——项目的 TS 主版本不构成安装期冲突。版本事实的权威在 `../version-compat.md`。

## 命令

项目没装时用 `pnpm dlx` 跑一次。`install` 会往 `package.json` 加 devDependency，之后改用 `pnpm exec react-doctor`，跑的是项目锁定的那一份。

```bash
pnpm dlx react-doctor@latest                          # 扫描当前目录
pnpm dlx react-doctor@latest --verbose --scope changed # 只报新增问题（官方推荐的一线命令）
pnpm dlx react-doctor@latest --scope files src/A.tsx   # 只扫指定文件
pnpm dlx react-doctor@latest rules list                # 列出规则
pnpm dlx react-doctor@latest why <file:line>           # 解释某条规则为什么报在这里
pnpm dlx react-doctor@latest install                   # 装成 agent skill
```

顶层命令：`design`、`scan`、`why`、`install|setup`、`ci`、`version`、`rules`。

**给位置参数时 `--scope` 不能是 `full`**，必须 `files`：

```text
Cannot combine file path arguments with --scope full. File path arguments use --scope files.
```

`--scope` 四个取值：`full`（默认）/ `files` / `changed`（只报新增问题）/ `lines`。

## 检查类别

`rules list` 实际报出 5 类，共 906 条规则：

```text
Accessibility (102)   Bugs (477)   Maintainability (135)   Performance (136)   Security (56)
```

用 `--category <name>` 过滤（可重复）。

> 该工具内部还有 `Correctness`、`Architecture` 之类的字符串，文档注释里也提到 "bundle-size"。但 `rules list` 只报出上述 5 类——**以 `rules list` 为准**，不要把内部 bucket 名写进规范。

## `install` 会写哪些位置

这是本技能唯一需要谨慎处理的地方：**`install` 会往多个 agent 目录写文件**。

```text
.claude/skills/react-doctor/SKILL.md          ← Claude Code
.agents/skills/react-doctor/SKILL.md          ← Cursor、Codex、Copilot、OpenCode、Warp、Kimi
.commandcode/skills/react-doctor/
.goose/skills/react-doctor/
skills/react-doctor/                          ← OpenClaw（项目根，无点号）
.github/workflows/react-doctor.yml
package.json                                  ← 加 devDependency + "doctor" script
```

两个反直觉点：**Cursor 走 `.agents/skills` 而不是 `.cursor/rules/`；Codex 走 `.agents/skills` 而不是 `.codex/skills/`**（后者是 global/home 级路径）。

**`install` 还会顺带写一个流水线配置文件**（上表里的 `.github/workflows/react-doctor.yml`）。本技能不生成流水线配置，所以走 `install` 路线时要**在报告里单列这一条**，由用户决定保留还是删掉。

下面这几行是 `--agent-hooks` 的额外写入。

### `--agent-hooks` 不要传

它会额外写：

```text
.claude/settings.json
.claude/hooks/react-doctor.mjs
.claude/hooks/react-doctor.sh
.cursor/hooks.json
```

**本技能不碰 `.claude/settings.json`**（见 SKILL.md 边界表）。所以：

- 执行 `install` 时**不加 `--agent-hooks`**
- 用 `--dry-run` 先看会写什么，**把写入的目录列进最终报告**，由用户决定保留哪些
- 用户明确要求装 agent hooks 时才加该参数，并在报告中单列这一条

## 配置

支持 `doctor.config.{js,mjs,cjs,ts,mts,cts,json,jsonc}` 与 `react-doctor.config.json`。JSON 版 schema 在 `https://react.doctor/schema/config.json`。

```ts
// doctor.config.ts
import { defineConfig } from "react-doctor/api";

export default defineConfig({
  ignore: {
    rules: ["react-doctor/no-danger"],
    files: ["src/generated/**"],
    overrides: [
      {
        files: ["components/search/HighlightedSnippet.tsx"],
        rules: ["react-doctor/no-danger"],
      },
    ],
  },
  rules: { "react-doctor/no-array-index-as-key": "warn" },
  categories: { Maintainability: "warn" },
});
```

常用键：`ignore.rules` / `ignore.files` / `ignore.overrides`、`rules`、`categories`、`lint`、`supplyChain`、`blocking`、`noScore`、`customRulesOnly`。

按 SKILL.md 的基线策略，首次接入把 `blocking` 设为 `none`（advisory）。

## 分数是诊断，不是目标

该工具会给出跨 security / perf / architecture 的**单一分数**。文章原话："Treat that score as a diagnostic, not a target"。

**规范文本里必须写明这一点。** 分数一旦成为目标，agent 会为数字优化而不是为代码质量优化。变异测试分数同理。

必要时用 `--no-score` 直接关掉分数、分享链接与崩溃上报。

## 验证

```bash
pnpm dlx react-doctor@latest --scope full . --verbose
```

确认扫描到的文件数非 0、有实际输出、版本兼容没有报错。

首次接入只看数字，不要求修。

## 局限

它查的是逐个文件的规则命中。**跨组件的漂移**（按钮在 A 组件有 label、在 B 组件没有）它看不见——那类问题要靠 Storybook 这类跨组件审查层。

## 出处

要点 6 的推荐工具。命令与写入路径取自发布包源码。

实测自 `react-doctor@0.9.13`（2026-09，夹具 `--scope full` 实跑）。
