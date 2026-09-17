---
name: frontend-guardrails
description: 为前端项目装护栏——ESLint 插件、目录分层边界、死代码与重复代码检测、Vitest 与 Playwright 测试体系，清掉存量报错，并按需用 portless 给工作树配免端口的命名 URL
disable-model-invocation: true
---

# Frontend Guardrails

给前端项目装上"挡住 AI 生成代码缺陷"的检查，并让它们真的在跑。八项检查默认全装、逐项可退，缺少的前置条件由本技能补齐。检查之外另有一项可选的开发体验：工作树的服务走 portless 命名 URL（第 5 步）。

## 三个词

**假绿**——检查跑完显示通过、实际一条都没查。本技能最坏的失败模式，每一步的"完成"判据都为它设计。

**哨兵**——一条把**假绿**逼成响亮报错的规则。`boundaries/no-unknown-dependencies` 是现成的一条。

**基线**——首次接入时存量问题的数量。它是开工时的读数，不是要清零的目标：太早把检查变成硬门禁会催生绕过手段，而这些 workaround 会长期留存。

## 职责边界

只装检查、配测试，外加第 5 步可选的 dev server 命名 URL。格式化与提交前钩子归 `/setup-pre-commit`；`.claude/settings.json` 与全局 `~/.claude/` 不代改；commit 由用户自己做；把检查挂到流水线上变成不可跳过也不在范围内。

| 何时读 | 文件 | 内容 |
| ------ | ---- | ---- |
| 装配插件、写 flat config、排查某条规则不报 | `references/eslint.md` | 6 个插件的安装与实测陷阱 |
| 定分层、排查 boundaries 一条不报 | `references/boundaries.md` | 目录约定流程、跨栈兜底表、四个坑 |
| 装 knip / jscpd、装配测试框架 | `references/tools.md` | 四者的配置与陷阱 |
| 配工作树命名 URL、URL 带端口、代理不在 443 | `references/portless.md` | portless 装配、443 前提、证书陷阱 |
| 项目用 pnpm，或依赖里有 `typescript` / `eslint` | `references/version-compat.md` | 版本事实的唯一权威，动手前先读 |

**references 总量上限 600 行**（当前 600）。加内容前先想清楚替换掉哪一段——它是实测结论的容身之处，不是配置文档的抄本。

---

## 步骤

### 1. 检测现状

修改任何文件前读取（存在才读）：`package.json`、lockfile、workspace 配置（`pnpm-workspace.yaml` / `workspaces` 字段）、`eslint.config.*` 或 `.eslintrc*`、其他 linter 的配置（`.oxlintrc*` / `biome.json`）、测试框架配置、`CLAUDE.md`、`AGENTS.md`。

包管理器按此顺序判定：`package.json` 的 `packageManager` 字段 → lockfile → workspace 配置。**信号互相矛盾时问用户，不猜。**

已有的配置按补缺 / 合并处理，只有用户明确要求时才重建。

再跑一次 `git status`：工作区脏就**警告用户、等确认再继续**——技能会改代码，混在一起后用户分不出哪些是技能改的。

**完成**：每项有结论——包管理器、是否 monorepo 及其包列表、**ESLint 主版本**与配置形态（flat / legacy / 无）、有无其他 linter、是否 React 及框架栈、有无 Vitest / Playwright、git 状态。

### 2. 确认选项

用 `AskUserQuestion` 一次问四题（每题 `multiSelect: true`）：

1. **ESLint 插件**：`eslint-plugin-react-doctor`（React 专属规则集，默认启用 566 条，含 jsx-a11y 无障碍规则：性能陷阱、可访问性、bundle 体积）／`eslint-plugin-boundaries`（守住目录分层，禁止 service 反向 import 组件这类依赖方向违规）／`eslint-plugin-sonarjs`（通用代码质量：认知复杂度过高、重复条件分支、重复字符串字面量）／`eslint-plugin-react-you-might-not-need-an-effect`（专查不必要的 `useEffect`：状态同步、派生值、响应 prop 变化）
2. **续**：`@vitest/eslint-plugin`（单测规则：测试里没有断言、忘了删的 `.only`）／`eslint-plugin-playwright`（E2E 规则：测试里的条件语句、漏 `await` 的断言、忘了删的 `.only`）／`knip`（找死代码：没人 import 的文件、没人用的 export、不再需要的依赖）／`jscpd`（找重复代码：同一段逻辑被写了两遍）
3. **monorepo**（仅检测到 workspace 时）：装根 / 逐包 / 两者，**默认根**
4. **ESLint 基建**（按下述现状取一面）：
   - 项目无 ESLint → 装整套基建 / 只装 eslint / 整簇跳过
   - 项目是 legacy `.eslintrc*` → 迁移到 flat / 跳过 `react-doctor` / 整簇跳过
   - 项目只有 oxlint / biome → 并存 / 替换 / 整簇跳过
   - 已就绪 → 不出这题

**默认全勾。** 缺 Vitest / Playwright 不缺选项——勾了就由第 6 步装框架补齐。唯一从选项里移出的是**项目技术栈用不上的插件**：非 React 项目不给 `react-doctor`（规则全是 React / JSX 触发点，装上一条都报不出来）。移出的项在报告里写明原因。

**完成**：八项各有"装 / 不装 / 不适用"的明确结论；每一项的缺席都有原因。

### 3. 目录约定

两个产出：**boundaries 的层定义**（目录名 + 允许方向）、**测试目录结构**。两者走同一条流程：

1. 按第 1 步判定的技术栈查 Context7，找框架官方文档里的目录约定
2. 用官方约定作为提议；查不到就用 `references/boundaries.md` 的兜底表
3. **`AskUserQuestion` 请用户确认或修改**——层与方向必须来自用户，代人臆造的层不成立

boundaries 只在勾选时才做；测试目录只在勾选 Vitest / Playwright 时才做。

**完成**：两项各有用户确认过的具体结论（层名、方向、目录路径），不是"按最佳实践"。

### 4. 装配 ESLint

**基建**（项目没有时）：`eslint`、`@eslint/js`（**主版本必须与项目 eslint 对齐，显式 pin**）、`typescript-eslint`、`globals`。TS 项目缺 `typescript-eslint` 时 `.tsx` 直接解析失败，插件全部失效。

**插件**（勾选的）：`eslint-plugin-react-doctor` 的 config 不带 `files` 也不带 parser，必须自己包一层，否则 flat config 匹配不到 `.tsx`，一条规则都不跑。

**边界规则**（勾选 boundaries 时）：除层规则外**加哨兵** `boundaries/no-unknown-dependencies`，并把参与依赖的所有本地目录（含生成目录）写进 `elements`。

**存量 disable 进台账**——扫一遍写成初稿：

```bash
grep -rn "eslint-disable" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
```

**scripts**——从这里开始，后面四步每装一个工具都顺手补上，规则统一：

- 逐工具一条（`lint`、`knip`、`jscpd`、`test`…），便于单点排查
- 一条聚合 `check` 串起全部已装检查
- **保留已有 script 不覆盖**；名字与内容按第 1 步判定的包管理器写
- 跨 script 串联带前缀（`pnpm run lint`），script 体里调二进制写裸名（`eslint .`）
- **knip 与 jscpd 不进 `check` 的失败路径**（见第 7 步）

**完成**：每个勾选的插件在项目**已有文件**上跑出非空输出——挑一个文件跑 `eslint <file>`，看到该插件的规则真的报出；`eslint .` 输出里没有解析错误；项目原有的规则一条没丢；每个 script 都实际跑过一次；存量 disable 已全部进台账。

### 5. 装配命名 URL（portless）

**开发体验项，不是检查**——装或不装都不影响护栏的完整性。要装与否由用户定，agent 不代答：`AskUserQuestion` 问一次「装 / 跳过」，**题干里罗列下面的收益与适合的情形**，别只问一句"要不要装 portless"。

- 收益：主工作树 `https://<name>.localhost`，链接工作树自动加分支前缀（`https://fix-ui.<name>.localhost`）——免记端口、免撞端口，来源不同顺带隔离 cookie 与 localStorage
- **值得装**：常开多个工作树，或同时推进多个项目
- **可以跳过**：几乎不用 worktree，或同一时间只跑一个项目——收益有限，跳过是正常选择、不是欠账；报告"跳过"段写"用户未勾选"，不写"未验证"
- 要求 Node.js 24+，项目版本更低就跳过并说明原因

装了才做这些：保留原有 `dev` script 不动，另加一条 `dev:portless`；**script 里不写死 `-p <port>`**——代理注入 `PORT`，写死端口就与代理脱节。代理必须在 443，URL 才免端口。`pnpm exec portless doctor` 不报 `Proxy is responding on port 443` 时（非交互环境拉起代理会退回非特权端口，URL 带端口），**让用户自己另开一个终端**跑 `pnpm exec portless proxy start` 并输入密码——它会 sudo 提权，密码只能交互输入，agent 不代跑，并把它写进报告的"需用户手动完成"。

装配细节与陷阱 → `references/portless.md`。

**完成**：装了的——`pnpm dev:portless` 起得来，`portless list` 里该工作树的域名**不带端口**；任一条不成立就在报告中标注未验证，并列出用户要手跑的命令。跳过的——报告"跳过"段写明"用户未勾选"。

### 6. 装配测试

按第 3 步确认的目录结构装配。项目已有 Vitest / Playwright 就只补缺，没有才装：

- 依赖 + config（复用项目现有 Vite 配置）
- **一个真实能跑的 smoke 测试**。只写 config 不写测试，`files` 匹配到空目录——插件一条不报，正是**假绿**
- Playwright 浏览器**默认不装**，`AskUserQuestion` 问用户是否继续（几百 MB 且失败率高）。不装就在报告里标注未验证

**完成**：smoke 测试真实执行并通过（Vitest 报出非 0 的 Test Files 数；Playwright 用 `--list` 列出预期用例）；未执行的项在报告里有明确标注。

### 7. 装配 knip / jscpd

两者都是**只报告、不阻塞**：不进 `check` 的失败路径，`ignore` 列表从最小开始。

**完成**：两个工具的首次报告里**扫描文件数非 0**、issue 计数是真实数字——数字是 0 的"干净"是**假绿**。

### 8. 清存量 + 报告

**只有 ESLint 进"清干净"范围**——knip 报的"没人 import 的导出"可能是给外部用的 API，jscpd 报的重复要靠重构合并，删它们比留着危险。

先 `eslint --fix`，再手工修剩下的。**上限 20 个文件 / 100 条错误，到顶就停**，把剩余清单交给用户。这个上限是硬约束：用户在执行前无法预知技能会改多少东西，无上限的全仓重写比留着告警更糟。

修的过程中**能改代码就改代码**；绕不过去而新加 disable 时，当场补一条台账——这一批最容易被漏记。

报告固定七段：

1. **已装**——包名与版本
2. **已配**——写入的文件路径
3. **跳过**——每项附原因（前置不满足 / 用户未勾选 / 未验证）
4. **基线**——清存量前后各多少条；到顶时列出剩余清单
5. **验证结果**——真实执行过的命令与原始输出、明确标注未验证项
6. **需用户手动完成**——如 `/setup-pre-commit`、`playwright install`
7. **本次修改过的文件路径**——逐条列出，用户据此和自己未提交的改动分开

**完成**：七段齐全；第 3、5 段没有空缺；每个数字来自实际执行，没有执行过的命令不出现在报告里。

---

## eslint-disable 台账

规则冲突有两种正当出口：**改代码**，或在 `eslint.config` 里**显式关掉**。两者都留在能被 review 的地方。`eslint-disable` 注释是第三种出口——它把例外藏进代码行里，项目不采用；要记的例外写进 `docs/eslint-disable.md`。

台账**头部写清上面这条规则**——它就是约定的载体，不依赖任何外部文档。每条记三样：**文件与行、被关掉的规则、原因**。原因要分清是**规则判断错了**还是**代码确实该这么写**，这是下次复查某条规则该不该留的唯一线索。项目没有 `docs/` 目录也照建：空台账就是"当前零例外"的声明。

## 这些检查盖得住的与盖不住的

检查只能发现它们被设计来发现的问题，全绿不等于有人理解了代码。品味、架构、产品判断仍归人类——目的是减少需要人工看的代码量。
