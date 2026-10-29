---
name: code-quality-baseline
description: 前端项目代码质量基线：ESLint 复杂度规则、React 与目录边界插件、jscpd 重复检测、knip 死代码检测、提交门禁，配置按占位符适配任意项目。
disable-model-invocation: true
---

# 代码质量基线

五层检查各管一段，互不重叠：

| 层 | 工具 | 抓什么 |
| -- | ---- | ------ |
| 函数内部 | ESLint + sonarjs | 分支太深、函数太长、参数太多 |
| 跨文件文本 | jscpd | 同一段代码被写了两遍 |
| 跨文件引用 | knip | 没人 import 的文件、导出、依赖 |
| 架构方向 | eslint-plugin-boundaries | service 反向 import 组件这类依赖方向违规 |
| 提交入口 | Husky + lint-staged + Prettier | 暂存区格式化与 `eslint --fix`，再跑 typecheck |

**假绿**——检查跑完显示通过、实际一条都没查。本技能最坏的失败模式，每一步的"完成"判据都为它设计。

**哨兵**——一条把**假绿**逼成响亮报错的规则。`boundaries/no-unknown-dependencies` 是现成的一条。

**基线**——首次接入时存量问题的数量。它是开工时的读数，不是要清零的目标：太早把检查变成硬门禁会催生绕过手段，而这些 workaround 会长期留存。

## 职责边界

装检查、接提交前门禁（含格式化）、定目录边界。`.claude/settings.json` 与全局 `~/.claude/` 不代改；**commit 由用户自己做**；把检查挂到 CI 流水线上变成不可跳过也不在范围内。

| 何时读 | 文件 | 内容 |
| ------ | ---- | ---- |
| 装配插件、写 flat config、排查某条规则不报 | `references/eslint.md` | 各插件的安装与实测陷阱 |
| 定分层、排查 boundaries 一条不报 | `references/boundaries.md` | 目录约定流程、跨栈兜底表、四个坑 |
| 项目用 pnpm，或依赖里有 `typescript` / `eslint` | `references/version-compat.md` | 版本事实的唯一权威，动手前先读 |
| 改阈值、调整规则、查工具选项 | `references/options.md` | 规则默认值、jscpd / knip 选项与陷阱 |

**references 总量上限 600 行**（当前 415）。加内容前先想清楚替换掉哪一段——它是实测结论的容身之处，不是配置文档的抄本。

## 适配点

配置块原样复用，只替换这些占位符：

| 占位符 | 含义 | 怎么定 |
| ------ | ---- | ------ |
| `<install>` | 安装依赖的命令 | pnpm `pnpm add -D`；npm `npm install -D`；yarn `yarn add -D` |
| `<exec>` | 执行本地二进制的命令 | pnpm `pnpm exec`；npm `npx`；yarn `yarn exec` |
| `<src>` | 源码根目录 glob | 项目现有目录，通常是 `src` |
| `<generated>` | 生成目录 glob | 带 `DO NOT MODIFY` 头或生成器产物的目录 |

`eslint.config.*` 的文件名、monorepo 的 workspace 键同样按现状替换。**阈值是起点，不是教条**：按基线调整，不按喜好。

改配置、调阈值、排查某条规则不报 → `references/options.md`。

## 步骤

### 1. 检测现状

修改任何文件前读取（存在才读）：`package.json`、lockfile、workspace 配置（`pnpm-workspace.yaml` / `workspaces` 字段）、`eslint.config.*` 或 `.eslintrc*`、其他 linter 的配置（`.oxlintrc*` / `biome.json`）、`CLAUDE.md`、`AGENTS.md`。

包管理器按此顺序判定：`package.json` 的 `packageManager` 字段 → lockfile → workspace 配置。**信号互相矛盾时问用户，不猜。**

已有的配置按补缺 / 合并处理，只有用户明确要求时才重建。

再跑一次 `git status`：工作区脏就**警告用户、等确认再继续**——技能会改代码，混在一起后用户分不出哪些是技能改的。

**完成**：每项有结论——包管理器、是否 monorepo 及其包列表、**ESLint 主版本**与配置形态（flat / legacy / 无）、有无其他 linter、是否 React 及框架栈、git 状态。

### 2. 选装工具

**先选工具，再定装配**——两轮都在动手前问完，第 3 步起的目录与配置都依赖这里的结论。

**第一轮**用 `AskUserQuestion` 分类列举全部可装项——两题工具 `multiSelect: true`、一题门禁（单选）；题干写明**默认全选**（门禁装整套），不要的取消勾选：

1. **应用代码规则**（写进 `src` 的 ESLint 规则）：`eslint-plugin-sonarjs`（通用代码质量：认知复杂度过高、重复条件分支、重复字符串字面量；复杂度阈值规则随它一起装）／`eslint-plugin-react-doctor`（React 专属规则集，默认启用 566 条，含 jsx-a11y 无障碍规则：性能陷阱、可访问性、bundle 体积）／`eslint-plugin-boundaries`（守住目录分层，禁止 service 反向 import 组件这类依赖方向违规）／`eslint-plugin-react-you-might-not-need-an-effect`（专查不必要的 `useEffect`：状态同步、派生值、响应 prop 变化）
2. **仓库级检查**（独立 CLI，扫全仓、只报告不阻塞）：`jscpd`（找重复代码：同一段逻辑被写了两遍）／`knip`（找死代码：没人 import 的文件、没人用的 export、不再需要的依赖）
3. **提交门禁**（装法见第 7 步；单选、**默认装整套**）：装整套（Husky + lint-staged + Prettier：暂存区格式化与 `eslint --fix`，再跑 typecheck）／跳过

非 React 项目不给 `react-doctor` 与 `react-you-might-not-need-an-effect`（规则全是 React / JSX 触发点，装上一条都报不出来）；`sonarjs` 的复杂度规则与 React 无关，保留。移出的项在报告里写明原因。

**第二轮**（需要时才开，同样 `AskUserQuestion`，每题单选）：

- **ESLint 现状处置**（项目 ESLint 未就绪时才出）：
  - 项目无 ESLint → 装整套基建 / 只装 eslint / 整簇跳过
  - 项目是 legacy `.eslintrc*` → 迁移到 flat / 跳过 `react-doctor` / 整簇跳过
  - 项目只有 oxlint / biome → 并存 / 替换 / 整簇跳过
- **安装范围**（仅检测到 workspace 时）：装根 / 逐包 / 两者，**默认装根**

第二轮会作废第一轮的部分勾选——**"只装 eslint"与"整簇跳过"废掉全部 ESLint 插件，"跳过 `react-doctor`"只废掉那一条**；报告第 3 段逐项写明。

**完成**：六项检查与提交门禁各有"装 / 不装 / 不适用"的结论，装配问题各有选择；每一项的缺席都有原因。

### 3. 目录约定

产出：**boundaries 的层定义**（目录名 + 允许方向）。流程：

1. 按第 1 步判定的技术栈查 Context7，找框架官方文档里的目录约定
2. 用官方约定作为提议；查不到就用 `references/boundaries.md` 的兜底表
3. **`AskUserQuestion` 请用户确认或修改**——层与方向必须来自用户，代人臆造的层不成立

boundaries 只在勾选、且未被第 2 步的现状处置作废时才做。

**完成**：用户确认过的具体结论（层名、方向、目录路径），不是"按最佳实践"。

### 4. 装配 ESLint

**基建**（项目没有 ESLint 且未选"只装 eslint"时）：`eslint`、`@eslint/js`（**主版本必须与项目 eslint 对齐，显式 pin**）、`typescript-eslint`、`globals`。TS 项目缺 `typescript-eslint` 时 `.tsx` 直接解析失败，插件全部失效。

**勾选的插件**：

```bash
<install> eslint-plugin-sonarjs
<install> eslint-plugin-react-doctor              # 仅 React
<install> eslint-plugin-react-you-might-not-need-an-effect   # 仅 React
<install> eslint-plugin-boundaries
<install> --save-exact eslint-import-resolver-typescript@4.4.5  # boundaries 需要
```

**flat config 的骨架**（多段配置用纯数组，ESLint 8.56 / 9 / 10 通用）：

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ["<src>/**/*.{ts,tsx}"],
    rules: {
      complexity: ["error", { max: 10 }],
      "sonarjs/cognitive-complexity": ["error", 10],
      "max-lines-per-function": [
        "error",
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      "max-depth": ["error", 3],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // 勾选的 React / boundaries 配置追加在这里
];
```

- `sonarjs.configs.recommended` 已带其余 sonar 规则与 `settings.react`；覆盖阈值写在后面的规则对象里，不要手拼 `plugins`
- `eslint-plugin-react-doctor` 的 config 不带 `files` 也不带 parser，必须自己包一层，否则 flat config 匹配不到 `.tsx`，一条规则都不跑
- `eslint-plugin-react-you-might-not-need-an-effect` 的 `recommended` 自带 `files`、`plugins`、`languageOptions`，可裸放
- **边界规则**：除层规则外**加哨兵** `boundaries/no-unknown-dependencies`，并把参与依赖的所有本地目录（含生成目录）写进 `elements`
- 骨架默认装 sonarjs；未勾选的插件及其规则块一并删掉
- 阈值默认值与调整信号见 `references/options.md`；插件装配细节与陷阱见 `references/eslint.md`

**存量 disable 进台账**——扫一遍写成初稿：

```bash
grep -rn "eslint-disable" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
```

**scripts**——从这里开始，后面几步每装一个工具都顺手补上，规则统一：

- 逐工具一条（`lint`、`jscpd`、`knip`…），便于单点排查
- 一条聚合 `check` 串起全部已装检查
- **保留已有 script 不覆盖**；名字与内容按第 1 步判定的包管理器写
- 跨 script 串联带前缀（`pnpm run lint`），script 体里调二进制写裸名（`eslint .`）

**完成**：每个勾选的插件在项目**已有文件**上跑出非空输出——挑一个文件跑 `eslint <file>`，看到该插件的规则真的报出；`eslint .` 输出里没有解析错误；项目原有的规则一条没丢；每个 script 都实际跑过一次；存量 disable 已全部进台账。

### 5. jscpd 重复检测

```bash
<install> jscpd
```

`.jscpd.json`：

```json
{
  "minTokens": 50,
  "minLines": 5,
  "format": ["typescript", "tsx"],
  "ignore": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.d.ts",
    "<generated>/**",
    "**/*.{test,spec}.*",
    "**/__snapshots__/**",
    "**/fixtures/**"
  ],
  "reporters": ["console"],
  "output": "report/jscpd"
}
```

- `typescript` 与 `tsx` 是两个格式：只写 `typescript` 会漏掉所有 `.tsx`
- 本地配置不写 `threshold`：默认只报告、不阻断；CI 用命令行 `--threshold N` 设闸
- 生成文件互相重复是结构必然，先排除；克隆两端都在生成目录内才是噪音
- `output` 目录写进 `.gitignore`
- 配置自动发现只在当前工作目录，不向上遍历；键拼错被静默忽略

**完成**：`<exec> jscpd <src>` 报告的分析文件数非 0、克隆数是真实数字；改一次 `minTokens`，计数随之变化。

### 6. knip 死代码检测

```bash
<install> knip
```

初始化用脚手架，**没有 `knip --init`**：npm 用 `npm init @knip/config`，pnpm 用 `pnpm create @knip/config`。

`knip.json`：

```json
{
  "$schema": "https://unpkg.com/knip@latest/schema.json",
  "project": ["<src>/**/*.{ts,tsx}"],
  "ignore": ["<generated>/**"],
  "ignoreDependencies": ["@types/*", "typescript", "tslib"],
  "ignoreExportsUsedInFile": { "interface": true, "type": true }
}
```

- **从不写配置开始跑一次**：框架插件会给 Next / Vite / 测试运行器自动补 `entry`；报告把真实入口标成未使用，再把具体入口写进 `entry`
- monorepo 里根层的 `entry` / `project` 被忽略，必须挪进 `workspaces["."]`
- `ignore` 只留给生成与 vendor；用它压真实问题会永久藏起来
- 首次接入不跑 `--fix`，先让报告立住基线

**完成**：`<exec> knip` 有真实 issue 计数、`<src>` 没被整体列为未使用、`Configuration hints` 按提示清过一遍。

### 7. 装配提交门禁

**把检查收进 commit**——Husky + lint-staged + Prettier + typecheck。第 2 步勾了才做；**钩子只能装仓库根**——monorepo 各 workspace 共用一条，与"安装范围"无关。

**依赖**：`husky`、`lint-staged`、`prettier`。**初始化**：`<exec> husky init`（建 `.husky/`、写 `prepare: "husky"`）；已有 Husky 只补缺，不重跑 init——它会无条件覆写已有的 `prepare` 与 `.husky/pre-commit`。

**三个文件**，已存在就合并、不覆盖：

`.husky/pre-commit`（v9+ 不要 shebang；命令随第 1 步的包管理器）：

```bash
pnpm exec lint-staged
pnpm run typecheck
```

- `typecheck` 缺失才补 `"typecheck": "tsc --noEmit"`；自有命令（如 `vue-tsc`）优先
- 每行只在对应工具真的装了、且跑得通时才写

`.lintstagedrc`（`eslint` 那行只在装了且项目有 ESLint 配置时写；`--ignore-unknown` 放行 Prettier 不认识的文件）：`{ "*": "prettier --ignore-unknown --write", "*.{ts,tsx,js,jsx}": "eslint --fix" }`。**lint-staged v17.5 起 intent-to-add（`git add -N`）的文件会被拒**——按提示普通 `git add` 即可。

`.prettierrc`（`.prettierrc*` / `prettier.config.*` / `package.json#prettier` / `package.yaml#prettier` 全无时才建）：`{ "useTabs": false, "tabWidth": 2, "printWidth": 80, "singleQuote": false, "trailingComma": "es5", "semi": true, "arrowParens": "always" }`

**不进钩子**：全量 `lint`（存量未清时每次都挡，挡出来的只有 `--no-verify`）；jscpd 与 knip（全仓扫描、只报告）。钩子 = 暂存区（秒级）+ 全量 typecheck。

**每条命令先手动跑一遍**（`lint-staged` 无暂存文件时空跑），跑不通的不写进钩子、写进报告的"需用户手动完成"。

**完成**：`.husky/pre-commit` 内容与勾选一致（可执行位非必需——git 跑的是 husky 生成的 `.husky/_/` shim）；`git config core.hooksPath` 有值；`sh .husky/pre-commit` 跑过；每条命令单独全绿，没跑通或没装的在报告里有记录。**提交仍由用户做**——报告标"下次提交起生效"，并把"提交一次确认门禁拦人"列进需用户手动完成。

### 8. 清存量 + 报告

**只有 ESLint 报出的问题进"清干净"范围**——knip 报的"没人 import 的导出"可能是给外部用的 API，jscpd 报的重复要靠重构合并，删它们比留着危险。

先 `<exec> eslint --fix`，再手工修剩下的。**上限 20 个文件 / 100 条错误，到顶就停**，把剩余清单交给用户。这个上限是硬约束：用户在执行前无法预知技能会改多少东西，无上限的全仓重写比留着告警更糟。

修的过程中**能改代码就改代码**；绕不过去而新加 disable 时，当场补一条台账——这一批最容易被漏记。

报告固定七段：

1. **已装**——包名与版本
2. **已配**——写入的文件路径
3. **跳过**——每项附原因（前置不满足 / 用户未勾选 / 未验证）
4. **基线**——清存量前后各多少条；到顶时列出剩余清单
5. **验证结果**——真实执行过的命令与原始输出、明确标注未验证项
6. **需用户手动完成**——**提交一次确认门禁真实拦人**；未跑通的安装或命令逐条列出
7. **本次修改过的文件路径**——逐条列出，用户据此和自己未提交的改动分开

**完成**：七段齐全；第 3、5 段没有空缺；每个数字来自实际执行，没有执行过的命令不出现在报告里。

---

## eslint-disable 台账

规则冲突有两种正当出口：**改代码**，或在 `eslint.config` 里**显式关掉**。两者都留在能被 review 的地方。`eslint-disable` 注释是第三种出口——它把例外藏进代码行里，项目不采用；要记的例外写进 `docs/eslint-disable.md`。

台账**头部写清上面这条规则**——它就是约定的载体，不依赖任何外部文档。每条记三样：**文件与行、被关掉的规则、原因**。原因要分清是**规则判断错了**还是**代码确实该这么写**，这是下次复查某条规则该不该留的唯一线索。项目没有 `docs/` 目录也照建：空台账就是"当前零例外"的声明。

## 这些检查盖得住的与盖不住的

检查只能发现它们被设计来发现的问题，全绿不等于有人理解了代码。品味、架构、产品判断仍归人类——目的是减少需要人工看的代码量。
