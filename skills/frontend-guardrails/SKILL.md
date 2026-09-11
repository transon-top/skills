---
name: frontend-guardrails
description: 为前端项目按需安装护栏并注入规范：tsconfig strict、OpenAPI 契约生成、ESLint 规则插件、架构边界、死代码与重复代码检测、变异测试。
disable-model-invocation: true
---

# Frontend Guardrails

为项目装上"挡住 AI 生成代码缺陷"的检查，并把检查背后的规则写进项目规范。

四组能力各自独立可选，可单独安装、单独跳过。

## 职责边界

只做"装检查"与"写规范"。相邻职责交给已有技能，同职责重复实现会让两处漂移：

| 事项 | 归属 |
| ---- | ---- |
| 格式化（Prettier）、提交前钩子（husky / lint-staged） | `/setup-pre-commit` |
| 测试框架搭建（Vitest / Playwright 配置与文件组织） | `/frontend-test-setup` |
| `.claude/settings.json`（hooks、权限）、全局 `~/.claude/` 配置 | 用户自行决定，不代改 |
| commit | 改动列清单交用户 |

检测到缺失时在报告中提示对应技能。

## 四个依赖簇

| 簇 | 覆盖 | 依赖 |
| -- | ---- | ---- |
| 一 类型与契约 | 别猜 API 字段；让编译器强制显式 | `typescript`（tsconfig 选项）、`@hey-api/openapi-ts`、`zod` |
| 二 ESLint 基建与规则 | linter 当行为过滤器；先划层边界；反复犯的错写成规则 | `eslint`、`typescript-eslint`、`eslint-plugin-sonarjs`、`eslint-plugin-react-you-might-not-need-an-effect`、`@vitest/eslint-plugin`、`eslint-plugin-playwright`、`eslint-plugin-jsx-a11y`、`eslint-plugin-boundaries` / `dependency-cruiser` |
| 三 检出已有问题 | 测你的测试；找死代码；找重复 | `@stryker-mutator/core`（+ `@stryker-mutator/vitest-runner`）、`knip`、`jscpd` |
| 四 面向模型的防护 | 把规则摆到模型生成时面前 | `react-doctor`、项目规范文件 |

各簇的判据、配置细节与反例 → `references/<簇>.md`；单个工具的安装与配置 → `references/tools/<tool>.md`。

**只读用户勾选的簇对应的文件**，未勾选的不进上下文。

版本差异是独立的参考：ESLint 主版本的写法分歧、TypeScript 的 peer 范围、pnpm 拦截 build script → `references/version-compat.md`。**项目用 pnpm，或依赖里有 `typescript` / `eslint` 时，动手前先读它**——那里几条踩中会静默失效。

---

## 步骤

### 1. 检查项目现状

修改任何文件前读取（存在才读）：`package.json`、lockfile、workspace 配置（`pnpm-workspace.yaml` / `workspaces` 字段）、`eslint.config.*` 或 `.eslintrc*`、`tsconfig.json` 及其 `extends` 链、OpenAPI spec 文件（`openapi.{json,yaml,yml}` / `swagger.*`）、既有测试框架与配置、`CLAUDE.md`、`AGENTS.md`。

**完成**：每项有结论——包管理器、是否 monorepo、**ESLint 主版本**及其配置形态（flat / legacy）、**TypeScript 版本**、有无 spec、是否 React、有无测试框架、规范文件现状。

已有配置先读再动：合并 / 补缺 / 优化，或用户明确要求时重建。

### 2. 选择依赖簇

用 `AskUserQuestion` 分批询问（每批不超过 4 项、`multiSelect: true`），按四簇组织，每项标注默认档位。

默认档位（用户未明确指定时按此给）：

- **默认开**（低误报、秒级）：tsconfig 严格选项（`strict` + 两项索引/可选属性检查）、`eslint-plugin-sonarjs`、TypeScript 规则、`knip`、`jscpd`（只报告不阻塞）
- **默认问**（需项目条件）：`eslint-plugin-jsx-a11y`、`eslint-plugin-playwright`（需已有 E2E）、`eslint-plugin-boundaries`（需用户说得出分层）、`@vitest/eslint-plugin`（需已有 Vitest）
- **默认关**（重成本或需外部输入）：`@stryker-mutator/core`、`@hey-api/openapi-ts` + `zod`、`react-doctor`

默认全开会制造它自己要防的失败模式：sonarjs 会对正常代码误报、变异测试给每个 PR 加几分钟、`eslint-disable` 与 ignore 列表的增长本身就是"检查正在失去覆盖"的信号。

另外两项：

- monorepo：询问装根 / 逐包 / 两者，**默认根**，并在报告中说明子包未单独配置
- 前置条件不满足的簇不出现在选项里：无 spec 不给契约生成、非 React 不给 `react-doctor`、无 E2E 不给 `eslint-plugin-playwright`

**完成**：勾选结果明确；未出现的簇说明原因。

### 3. 簇一 类型与契约

细节 → `references/contract.md`、`references/tools/tsconfig.md`、`references/tools/openapi-ts.md`。

- tsconfig：合并 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`。先读现有 `tsconfig.json` 与 `extends` 链——若 `strict` 已在某个 base config 里，不重复写
- 契约：**有 spec 才配**。问用户 spec 的位置（URL / 本地文件）后生成 `openapi-ts.config.ts`；生成物入库，并在规范里写明"手改会被覆盖"
- 没有 spec：跳过，报告中写明"不适用：未找到 OpenAPI spec"

**完成**：tsconfig 的改动经 `tsc --noEmit --showConfig` 确认生效；每个勾选项有产物或明确的跳过原因。

### 4. 簇二 ESLint 基建与规则

细节 → `references/lint.md`、`references/tools/eslint-plugins.md`、`references/tools/boundaries.md`。

- **先探测项目 ESLint 主版本**，按版本选写法（见 `version-compat.md`），版本由项目定
- 无 ESLint 时才装（`eslint` + `typescript-eslint` + `@eslint/js`），版本在报告中说明并交用户确认
- 已有配置：**在其上追加插件，不重写**。legacy `.eslintrc*` 迁移仅在用户明确要求时做
- 所有新启用的规则级别设 `warn`（理由见「基线策略」）
- 边界规则：先问用户项目的层是什么（目录名 + 允许方向），代人臆造的层不成立。报错文案必须同时说明"为什么有这条规则"和"应该放到哪里"
- 自定义规则：**只在用户能说出具体事故时写**。没有事故就只在规范文本里给判据，不生成规则脚手架

**完成**：每个勾选的插件造一个必报样例、确认它真的报；已有配置的原有规则一条没丢。

### 5. 簇三 检出

细节 → `references/detect.md`、`references/tools/knip.md`、`references/tools/jscpd.md`、`references/tools/stryker.md`。

- `knip`：初始化配置，`ignore` 列表从最小开始
- `jscpd`：markup 与 logic 用**不同阈值**——重复的 JSX 可能是有意的，重复的业务逻辑更可能成为维护问题
- `stryker`：**不设失败阈值**（equivalent mutants 永远存在，分数一旦成为目标，agent 会为数字优化）；`mutate` 范围默认限定。**`plugins` 必须显式声明** `["@stryker-mutator/vitest-runner"]`——自动加载在 pnpm 布局下不生效
- `stryker` 会留下 `.stryker-tmp/sandbox-*/`（含 `@ts-nocheck` 的项目副本），**加进 eslint ignores / knip ignore / jscpd ignore / .gitignore**，否则下次 lint 炸出数百条报错
- 覆盖不到的部分（别名解析、`vi.mock()` 是否过期）用小 Node 脚本补。**自定义检测器必须自带测试**——它们常由被它们监管的同一个 AI 写，静默漏报会造成虚假信心

**完成**：三个工具的首次报告都有实际数字，且扫描文件数非 0（数字是 0 说明没扫到东西，不是干净）。

### 6. 簇四 面向模型的防护

细节 → `references/agent-rules.md`、`references/tools/react-doctor.md`。

- `react-doctor`：仅 React 项目。它给出的综合分数**只当诊断，不当目标**
- 规范注入在步骤 9 执行，本步只确定规范内容

**完成**：列出 `react-doctor` 会写的每一处路径（它顺带写一个流水线配置文件），标明哪些已写、哪些待用户确认。

### 7. 聚合入口与 scripts

在目标项目 `package.json` 补 script，**保留已有 script 不覆盖**：

- 逐工具独立 script（`lint`、`typecheck`、`knip`、`jscpd` …），便于单点排查
- 一条聚合 `check` 串起全部已装检查

`check` 的退出码行为按用户勾选的严格度决定：只报告的检查（如 `jscpd`、`knip` 首次接入）不进 `check` 的失败路径，或放在 `check:report` 里。

**完成**：`check` 与每个逐工具 script 都实际跑过一次；已有 script 与原来逐字一致。

### 8. 逐项验证

每簇装完立刻验证，不留到最后统一跑。原则：**命令实际执行并核对输出**——没执行过的命令不能声称通过。

验证目标是"证明配置正确"，不是清理存量告警：

- 单文件 smoke 为主：挑一个既有源文件跑 `npx eslint <file>`，确认工具能加载、配置能解析、规则真在生效
- `npx tsc --noEmit` 确认 tsconfig 选项生效
- 全量跑只报告**告警计数**，不逐条列、不要求修
- 无法执行的项目（无网络、无 spec、缺凭据）列入报告并标注未验证

**完成**：每项有结论（通过 / 不适用 / 未验证），附实际输出。

#### 静默失效优先

这类工具最坏的失败模式不是报错，是**全绿但其实什么都没查**。已知的静默点：

| 工具 | 静默条件 | 表现 |
| ---- | -------- | ---- |
| `eslint-plugin-boundaries` | 缺 `import/resolver`、或 `pattern` 匹配不到 | 规则一条不报 |
| `dependency-cruiser` | TS 版本超出 peer 范围 | `0 modules cruised` |
| `jscpd` | 路径/格式没匹配上 | `Warning: jscpd analyzed no files`，仍 exit 0 |
| 任意 ESLint 插件 | `files` 没匹配上 | 输出为空 |

**验证时主动造一个"必须报错"的样例**，看它是否真的报。只确认"没报错"什么都证明不了。能用哨兵规则（如 `boundaries/no-unknown-dependencies`）把静默变成报错的，都加上。

### 9. 注入规范

细节与模板 → `references/agent-rules.md`。

文件选择：按项目根目录 `CLAUDE.md` / `AGENTS.md` 现状——只存在一个则注入它，都存在则查两份职责放最合适处、另一份只加短引用，都不存在则创建 `CLAUDE.md`（用户要求 `AGENTS.md` 则创建它）。

用 managed markers `<!-- FRONTEND_GUARDRAILS_START -->` / `<!-- FRONTEND_GUARDRAILS_END -->` 包裹，重跑只替换 marker 之间内容，不追加新的一份。

注入文本里**只出现这个项目的事实与写给这个项目的指令**——不含本技能的名字、其他技能的名字、技能文件路径、工具出处。逐句过删除测试，判据见 `references/agent-rules.md` 的「注入内容的边界」。

**完成**：marker 只出现一次，用户原有内容未动；注入文本逐句过了删除测试。

### 10. 最终报告

已装 / 已配 / 跳过（含跳过原因）/ 执行过的验证及结果 / 未验证项 / 保留的既有配置 / 需用户手动完成的步骤（如 `/setup-pre-commit`、填写 spec 地址）。

**完成**：每一簇都有结局——装了、跳过了、还是未验证；没有一簇是空白的。

## 基线策略

护栏装完就跑不动，等于没装——"turn on strict and four hundred rules" 在既有仓库首跑产生数千错误，然后整个努力被放弃。因此：

1. **先立基线**：新规则以 `warn` 进入，老代码保持原样，检查优先只跑变更文件；新代码与改动代码必须通过
2. **规则逐条升级**：`warn` 抓到真 bug 就升 `error`；一个月只产生噪声的规则关掉
3. **不要急着强制**：太早把检查变成硬门禁会催生绕过手段，而这些 workaround 会长期留存。等规则稳定、误报清干净了再谈强制

规范文本里要写明这条升级 / 退役流程，否则半年后没人知道某条规则为什么开着。

## 成本与适用性

三个条件同时成立才回本：代码生命周期超过一个季度、除作者外有人读、bug 的影响超出开发团队。

三人小队、还在找 PMF、一半代码一个月后就死掉的项目，这套是负担。用户的项目不符合时**直说**，只装用户真正需要的。

## 这些检查盖得住的与盖不住的

检查只能发现它们被设计来发现的问题，全绿不等于有人理解了代码。品味、架构、产品判断仍归人类——目的是减少需要人工看的代码量。

把检查变成不可跳过（挂到流水线上）是另一个话题，不在本技能范围内。

## 出处

判据来自 Evil Martians《10 anti-AI slop moves for frontend projects going faster than humans can review》（2026-09）的前九个要点；原文第 10 条讲流水线门禁，不在本技能范围内。

<https://evilmartians.com/chronicles/ten-anti-ai-slop-moves-for-frontend-projects-going-faster-than-humans-can-review>

各 reference 的「出处」小节用要点序号与英文原标题指回这篇文章。
