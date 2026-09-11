# 簇二 ESLint 基建与规则

覆盖三个要点：**linter 当行为过滤器**、**先划层边界**、**反复犯的错写成规则**。

## 为什么 lint 的位置变了

lint 配置过去是"风格文档"——缩进、分号、引号。现在它是**针对已知默认行为的写作者的过滤器**。

生成代码的特征是：**逐行优雅，文件级别失控**。每个函数都合理，但文件里堆出了没人主动选择的结构——多个 `useEffect` 互相同步状态、嵌套四层的条件、重复的字符串字面量、同一个判断分支写两遍。没有一处"写得难看"，整体却没人会这么设计。

所以规则的关注点从"格式"移到"行为"。

## 规则的两个来源

写一条规则已经很便宜（"a working rule takes ten minutes with AI"，过去要半天），规则从"投资"变成"对反复出现错误的常规响应"。但便宜不等于该写，规则只有两类值得存在：

- **behavior filter** —— 抵消 AI 从外部带入的默认做法（它的训练分布里这样做最常见）
- **scar** —— 已经上线过的 bug 留下的伤疤

判据原文：**"if you can't name the incident behind it, don't write it."**

说不清是哪次事故催生的规则，不要写。没有事故就不要生成规则脚手架——留一个永远没人填的目录比没有更糟。

### 伤疤的例子

一条真实规则：禁用 service 返回值上的 `Math.round` 与 `toFixed`，并把原因打印出来。

事故经过：service 先把小时四舍五入到 0.1，formatter 又舍入一次，`Math.round(h * 10) / 10` 把 26h15m 变成 26h18m，多出 3 分钟。排查花掉半天，因为**每一步单独看都正确**。

规则输出文案本身就承担了解释责任：

```text
Services compute, formatters round.
Rounding twice moves the value off its true one: Math.round(h * 10) / 10
turned a 26h15m total into 26h18m.
```

写规则时把这段文案当成规则的一部分。只说"哪里错了"的报错，半年后会被 `eslint-disable` 掉。

## 常用规则集

按默认档位组织（见 SKILL.md）。安装与 flat config 写法 → `tools/eslint-plugins.md`。

| 规则集 | 职责 | 默认 |
| ------ | ---- | ---- |
| `eslint-plugin-sonarjs` | cognitive complexity、identical branches、duplicated string literals、nested control flow。整套规则里占比最大的一档 | 开 |
| TypeScript 规则 | `no-explicit-any`、`no-non-null-assertion`、导出显式返回类型、`consistent-type-definitions` | 开 |
| `eslint-plugin-react-you-might-not-need-an-effect` | 检测不必要的 `useEffect` | React 项目开 |
| `eslint-plugin-jsx-a11y` | JSX 无障碍 | 问 |
| `@vitest/eslint-plugin` | `expect-expect`（测试无断言）、`no-focused-tests`（忘删的 `.only`） | 有 Vitest 时问 |
| `eslint-plugin-playwright` | E2E 里的条件语句、漏 `await` 的断言、`.only` | 有 E2E 时问 |

几条值得单独说明的：

- **`no-non-null-assertion` 风险最高**——它禁止的是"命令 TypeScript 在某个点忽略 null/undefined"的写法。AI 爱用它消掉类型错误，等于在错误处贴创可贴
- **`consistent-type-definitions`** 主要防生成代码在 `interface` 和 `type` 之间来回切换
- **多余 effect 是最频繁的 AI 改动**——AI 常用 effect 做状态同步、派生值、响应 prop 变化，这三类在 React 里都不该用 effect
- **lint 只能查到"测试有没有断言"**，断言是否**有意义**查不出来，那交给变异测试（→ `detect.md`）
- **`jsx-a11y` 只能逐文件工作**，跨组件的无障碍漂移它看不见（如按钮在 A 组件有 label、在 B 组件没有）

### 两条"无聊"规则值得单独开

- 文件名与导出名一致
- import 只走别名，不走相对路径

理由不是美观：**死代码检测器依赖路径与命名**。命名随机会让 `knip` 这类工具的报告失真（它认不出这个文件就是那个模块）。

## 层边界

AI 不记得你的架构，会把应用"往 GitHub 平均值拽"——one reasonable-looking import at a time。每一次 import 单独看都合理，累积起来架构就没了。

**先问用户项目的层是什么**（目录名 + 允许的依赖方向），不要代人臆造分层。文章给的参考边界：

- 依赖单向流动。组件可以依赖 service；service 不能依赖组件
- 工具、类型、配置不含领域逻辑
- 设计系统与业务状态、API 调用、领域代码隔离，以便独立升级或替换
- mock 不进生产构建
- router 只做"把路由映射到页面"，不干别的

**报错文案与失败本身同等重要**：必须告诉开发者 / agent"应该放到哪里"，而不只是"哪里错了"。

```text
x boundaries(dependencies): Business layers stay UI-free: a service, store, lib
  or type file must not import components, pages or hooks. A type shared with
  a form belongs in src/types or next to the service.
```

工具选择与配置 → `tools/boundaries.md`。

## ESLint 版本

**按项目实际的 ESLint 主版本适配配置**，不要因为本技能的示例写了一个版本就升降项目。生态里大量插件仍以 ESLint 9 为适配基线，强推版本会连带撞上一堆 peer 冲突。

探测：`package.json`、lockfile、`pnpm exec eslint --version`。各版本写法差异 → `tools/eslint-plugins.md` 的「先探测版本，再选写法」与「版本差异清单」。版本事实的权威在 `version-compat.md`。

## 跑过变异测试之后

`stryker` 会留下 `.stryker-tmp/sandbox-*/`——整个项目的副本，每个文件带 `@ts-nocheck`。**必须加进 `eslint` 的 `ignores`**，否则下一次 lint 会炸出成百上千条 `ban-ts-comment`。详见 `tools/stryker.md`。

同理，生成目录（OpenAPI client）要排除出 lint，但要**声明成 boundaries 的 element**——排除出 lint 和排除出边界检查是两回事。

## 规则级别：一律 `warn` 起步

理由与升级流程见 SKILL.md「基线策略」。**项目自己的规则是另一回事**——别人的 preset 可以批量装入，自己写的规则必须有事故依据。

## 成本

- sonarjs 会对正常代码误报，jscpd 会在测试与 fixture 中误报
- `eslint-disable` 与 ignore 列表增长是"检查正在失去覆盖"的信号，要定期复查
- 一年没抓到任何有用东西的规则应复查或移除
- **最大成本是新人上手**："A new developer can hit hundreds of rules before they understand why those rules exist"——所以错误信息必须同时说明"为什么有这条规则"和"该怎么做"

## 出处

要点 3「Use the linter as a behavior filter」、要点 4「Set layer boundaries before the app drifts toward the GitHub average」、要点 5「Turn recurring mistakes into linter rules」。
