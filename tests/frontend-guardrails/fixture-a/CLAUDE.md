# fixture-a

<!-- FRONTEND_GUARDRAILS_START -->

## 代码护栏

这些检查只降低错误频率，不保证任何事，也不替代人工 review。

### 类型

- 后端响应类型从 `openapi.json` 生成（`pnpm openapi-ts`），生成目录 `src/client/` 不手改；spec 变更后重跑生成
- 响应用生成的 Zod schema 在运行期校验后再使用

### 代码规则

- 写完跑 `pnpm lint`。规则挡路时改代码，或调规则级别并写明理由——`eslint-disable` 会让检查失去覆盖面
- 派生值、状态同步、响应 prop 变化在渲染期算或放进事件处理，不用 `useEffect`
- 类型报错补真实判断，不写 `!` 消掉
- 测试必须有断言，提交前清掉 `.only`

### 分层

依赖单向：组件层经 `src/hooks` 的查询 hook 访问 service，不直接依赖。

```text
src/components  →  src/hooks  →  src/services  →  src/client
src/lib、src/types、src/utils 不含领域逻辑，不得 import 组件或 hook
```

报错信息会说明应该放到哪里，读它。

### 检出

- `pnpm knip` 找未使用的文件 / 导出 / 依赖
- `pnpm dup` 找重复代码——写新实现前先搜已有
- `pnpm doctor` 跑 React 规则扫描（含无障碍）
- `pnpm deps` 跑架构边界与循环依赖检查

这几个只报告不阻塞（见 `check:report`），数字是基线。**分数是诊断，不是目标**

### 规则维护

新规则以 `warn` 进入：抓到真实 bug 升 `error`，一个月只有噪声就关掉。加规则要有事故依据。

已知噪声（故意关闭，不要重新打开）：`sonarjs/file-header`、`sonarjs/no-implicit-dependencies`（认不出 Vite 的 peer 依赖与 `@/` 别名）。

<!-- FRONTEND_GUARDRAILS_END -->
