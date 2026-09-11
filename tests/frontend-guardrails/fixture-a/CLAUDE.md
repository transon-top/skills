# fixture-a

<!-- FRONTEND_GUARDRAILS_START -->

## 代码护栏

本项目装了以下自动检查。它们只能降低错误频率，不保证任何事，也不替代人工 review。

### 类型与契约

- API 类型从 `openapi.json` 生成（`pnpm openapi-ts`），**不要手写**与后端响应相关的类型
- 生成目录 `src/client/` 不手动修改，spec 变更后重跑生成命令
- 响应在运行期用生成的 Zod schema 校验后再使用

### 代码规则

- 写完代码跑 `pnpm lint`，不要用 `eslint-disable` 绕过——它会让检查失去覆盖
- 状态同步、派生值、响应 prop 变化**不用 `useEffect`**，直接在渲染期计算或提到事件处理里
- 不使用 `!` 非空断言消掉类型错误；补真实判断
- 测试必须有断言，提交前清掉 `.only`

### 分层

依赖单向：组件层不得直接依赖 service 层，请通过 `src/hooks` 暴露的查询 hook 间接访问。

```text
src/components  →  src/hooks  →  src/services  →  src/client
src/lib、src/types、src/utils 不含领域逻辑，不得 import 组件或 hook
```

报错信息会说明应该放到哪里，读它。

### 检出

- `pnpm knip` 找未使用的文件 / 导出 / 依赖
- `pnpm dup` 找重复代码。**复用已有实现，不要新写一份**
- `pnpm doctor` 跑 React 规则扫描（含无障碍）
- `pnpm deps` 跑架构边界与循环依赖检查

这几个当前只报告不阻塞（见 `check:report`），数字是我们的基线。

### 规则的升级与退役

新规则一律以 `warn` 进入。**抓到真实 bug 的规则升级为 `error`；一个月只产生噪声的规则关掉。**

加规则前先问：这条规则背后是哪次事故？**说不清事故的规则不要加。**

已知噪声（故意关闭，不要重新打开）：`sonarjs/file-header`（要求版权头）、`sonarjs/no-implicit-dependencies`（认不出 Vite 的 peer 依赖与 `@/` 别名）。

### 提交前

提交钩子与格式化由 `/setup-pre-commit` 配置，不在本技能范围内。

<!-- FRONTEND_GUARDRAILS_END -->
