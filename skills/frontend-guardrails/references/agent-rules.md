# 簇四 面向模型的防护与规范注入

对应要点 6「Put the rules in front of the model」。前面所有检查都是**事后**的；这一簇尝试把规则放到**模型生成时**的面前。

## 两个手段

- **`react-doctor`**（仅 React）：可作项目扫描，也可装成 skill 让 agent 在写代码时就能看到问题。用法 → `tools/react-doctor.md`
- **项目规范文件**：`CLAUDE.md` / `AGENTS.md`，本技能注入的那块内容

## 必须写进规范的三个前提

不写清楚这三点，注入的规范会被当成噪音：

### 1. 预防是概率性的

规则文件每次会话只被读一次，要跟 40 行其他内容和模型权重里的百万个仓库竞争。它**只能降低错误频率，不保证任何事**，并且**不取消**任何一项事后检查。

写成"AI 必须遵守"会给人错误的安全感；写成"这些是常见失败模式，写完自查"才符合实际。

### 2. 分数是诊断，不是目标

这类工具常给一个跨 security / perf / architecture 的**单一分数**。文章原话："Treat that score as a diagnostic, not a target"。

分数一旦成为目标，agent 会为数字优化而不是为代码质量优化——删掉难写的代码、加上无意义的断言，分数就上去了。变异测试分数同理。

### 3. hooks 比规则文件更可靠

更彻底的做法是把防护从规则文件移入 hooks——对变更文件跑 linter，"same session, same feedback loop, no competition for attention"（同一会话、同一反馈回路、不与其他内容争夺注意力）。

**本技能不写 `.claude/settings.json`**（见 SKILL.md 边界表）。pre-commit 类钩子归 `/setup-pre-commit`。规范里只说明这条理由，并指向该技能。

---

## 注入模板

用 managed markers 包裹，按用户勾选的簇拼装内部块。**未勾选的块不写进去**。

````md
<!-- FRONTEND_GUARDRAILS_START -->

## 代码护栏

本项目装了以下自动检查。它们只能降低错误频率，不保证任何事，也不替代人工 review。

### 类型与契约

- API 类型从 OpenAPI spec 生成，**不要手写**与后端响应相关的类型
- 生成目录（如 `src/api`）不手动修改，spec 变更后重跑生成命令
- 响应在运行期用 Zod 校验后再使用

### 代码规则

- 写完代码跑 `<lint 命令>`，不要用 `eslint-disable` 绕过——它会让检查失去覆盖
- 状态同步、派生值、响应 prop 变化**不用 `useEffect`**，直接在渲染期计算或提到事件处理里
- 不使用 `!` 非空断言消掉类型错误；补真实判断
- 测试必须有断言，提交前清掉 `.only`

### 分层

```text
<按用户确认的层填写：目录 + 依赖方向>
```

### 检出

- `<knip 命令>` 找未使用的文件 / 导出 / 依赖
- `<jscpd 命令>` 找重复代码。**复用已有实现，不要新写一份**
- 这两个检查当前只报告不阻塞，数字是我们的基线

### 规则的升级与退役

新规则一律以 `warn` 进入。**抓到真实 bug 的规则升级为 `error`；一个月只产生噪声的规则关掉。**

加规则前先问：这条规则背后是哪次事故？**说不清事故的规则不要加。**

### 提交前

提交钩子与格式化由 `/setup-pre-commit` 配置，不在本技能范围内。

<!-- FRONTEND_GUARDRAILS_END -->
````

## 拼装规则

- 只写用户勾选的簇对应的块
- 命令字符串用项目实际的 package manager 与 script 名（`pnpm lint` / `npm run lint`）
- 分层那块**必须来自用户**，不代人臆造
- 若项目已有 `docs/` 下的规范文档，把完整版本放那里，`CLAUDE.md` 只留短引用 + marker

## 文件选择

- 只存在 `CLAUDE.md` 或只存在 `AGENTS.md` → 注入存在那个
- 都存在 → 查两份职责，放最合适的一处，另一份只加短引用
- 都不存在 → 创建 `CLAUDE.md`（用户要求 `AGENTS.md` 则创建它）

再次运行只替换 marker 之间内容，不追加新的一份，不覆盖用户原有内容。

## 出处

要点 6「Put the rules in front of the model」，及其子链接《Stop writing rules in AGENTS.md, use agent hooks and nano-staged instead》与《Vibe coding in style dot md》。
