# 测试边界

## 决策树

判断一个测试应该使用哪个工具时，按下面顺序判断。

### 1. 主要是在测试函数 / module 的行为吗？

使用 **Vitest**。

例如：

- calculation
- parser
- formatter
- validation
- state transition
- data transformation
- service behavior

### 2. 是 Hook 或独立 component 的行为吗？

通常使用 **Vitest**。

例如：

- Hook 状态变化
- component callback
- loading / disabled / error 状态
- 根据 props 产生不同结果

### 3. 是在描述用户完成一个业务目标吗？

使用 **Playwright**。

例如：

- 登录
- 创建订单
- checkout
- 修改账户设置
- 权限相关流程

### 4. 是否跨越多个 route / page，或者依赖真实运行中的应用？

优先使用 **Playwright**。

### 5. 是否需要大量 edge cases？

优先使用 **Vitest**。

E2E 应该覆盖有代表性的关键路径，而不是所有组合情况。

---

## 常见场景

| 场景 | 工具 |
| --- | --- |
| `calculateOrderTotal()` | Vitest |
| coupon calculation | Vitest |
| email validation | Vitest |
| `useAuth()` 状态变化 | Vitest |
| Button loading 状态 | Vitest |
| login workflow | Playwright |
| login 后 redirect | Playwright |
| checkout workflow | Playwright |
| authorization workflow | Playwright |
| 跨页面创建订单 | Playwright |

---

## 避免重复

允许两个测试层级同时覆盖同一个大功能。

但不应该让两个层级重复完整的测试矩阵。

例如：

```text
Vitest
30 个 coupon calculation cases

Playwright
1 个 checkout + valid coupon 流程
```

通常比：

```text
Playwright
30 个 coupon calculation cases
```

更合理。

核心原则：

> Vitest 负责“逻辑是否正确”。
>
> Playwright 负责“用户是否真的可以完成这件事”。

---

## 新增功能时的测试分配

新增功能按组成部分拆分：

- 内部逻辑 / validation / state transition → Vitest
- 用户操作链路（选择、下单、账户设置）→ Playwright

同时包含两者时：Vitest 覆盖复杂逻辑 + 边界条件，Playwright 覆盖 1~2 条核心业务路径，重复 case matrix 交给 Vitest。

例如新增优惠券功能：

```text
计算规则、validation → Vitest
用户选择优惠券、用优惠券完成下单 → Playwright
```
