# fixture-b

<!-- FRONTEND_GUARDRAILS_START -->

## 代码护栏

本项目装了以下自动检查。它们只能降低错误频率，不保证任何事，也不替代人工 review。

> 本项目没有 OpenAPI spec、不是 React、没有测试框架，
> 因此契约生成、React 规则、测试 lint、变异测试四类检查**未启用**。
> 需要时补上对应前置条件再接入。

### 代码规则

- 写完代码跑 `pnpm lint`，不要用 `eslint-disable` 绕过——它会让检查失去覆盖
- 不使用 `!` 非空断言消掉类型错误；补真实判断

### 分层

```text
src/services、src/lib、src/utils  →  src/cli
```

service 层不得依赖 cli 层：输出格式属于 cli 的关注点，service 应返回结构化数据，由 cli 渲染。报错信息会说明应该放到哪里，读它。

### 检出

- `pnpm knip` 找未使用的文件 / 导出 / 依赖
- `pnpm dup` 找重复代码。**复用已有实现，不要新写一份**
- `pnpm deps` 跑架构边界与循环依赖检查

这几个当前只报告不阻塞（见 `check:report`），数字是我们的基线。

### 规则的升级与退役

新规则一律以 `warn` 进入。**抓到真实 bug 的规则升级为 `error`；一个月只产生噪声的规则关掉。**

加规则前先问：这条规则背后是哪次事故？**说不清事故的规则不要加。**

### 提交前

提交钩子与格式化由 `/setup-pre-commit` 配置，不在本技能范围内。

<!-- FRONTEND_GUARDRAILS_END -->
