# fixture-b

<!-- FRONTEND_GUARDRAILS_START -->

## 代码护栏

这些检查只降低错误频率，不保证任何事，也不替代人工 review。

> 本项目没有 OpenAPI spec、不是 React、没有测试框架，因此契约生成、React 规则、测试 lint、变异测试四类检查**未启用**。接入前先补对应前置条件。

### 代码规则

- 写完跑 `pnpm lint`。规则挡路时改代码，或调规则级别并写明理由——`eslint-disable` 会让检查失去覆盖面
- 类型报错补真实判断，不写 `!` 消掉

### 分层

```text
src/services、src/lib、src/utils  →  src/cli
```

service 不依赖 cli：输出格式是 cli 的关注点，service 返回结构化数据，由 cli 渲染。报错信息会说明应该放到哪里，读它。

### 检出

- `pnpm knip` 找未使用的文件 / 导出 / 依赖
- `pnpm dup` 找重复代码——写新实现前先搜已有
- `pnpm deps` 跑架构边界与循环依赖检查

这几个只报告不阻塞（见 `check:report`），数字是基线。**分数是诊断，不是目标**

### 规则维护

新规则以 `warn` 进入：抓到真实 bug 升 `error`，一个月只有噪声就关掉。加规则要有事故依据。

<!-- FRONTEND_GUARDRAILS_END -->
