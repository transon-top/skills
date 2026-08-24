# Agent Instructions 注入模板

根据用户最终选择的测试方案使用对应模板。

## Vitest + Playwright

````md
<!-- FRONTEND_TEST_SETUP_START -->

## Testing

项目使用两层测试体系：

- **Vitest**：Unit Test 和 module-level Integration Test
- **Playwright**：E2E 和核心业务流程测试

### 测试边界

测试 code behavior 时使用 Vitest：

- pure functions
- data transformation
- validation
- hooks
- services
- state / business logic
- focused component behavior
- edge cases

测试 user behavior 时使用 Playwright：

- critical user journeys
- authentication / authorization
- cross-page workflows
- browser interactions
- core business workflows

如果 UI 发生较大改版后测试仍然应该成立，优先使用 Vitest。

如果测试描述的是用户如何完成一个业务目标，优先使用 Playwright。

不要在两个测试层级重复完整的测试矩阵。

### 文件组织

Vitest 测试优先与源码 colocate：

```text
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx
```

Playwright 测试放在 `src/` 外，并按照 business domain 组织：

```text
tests/
  e2e/
    auth/
    order/
    user/
```

不要把 E2E 测试组织成 page / component 源码目录的镜像。

### 命名

Vitest 默认使用：

```text
*.test.ts
*.test.tsx
```

Playwright 默认使用：

```text
*.spec.ts
*.spec.tsx
```

如果项目已有命名规范，遵循项目现有规范。

### Playwright 规则

优先使用 role、label、visible text 或稳定的 test id。

避免使用与 DOM 实现强绑定的 CSS / XPath selector。

保持 E2E test deterministic 和独立。

不要把核心 business assertion 隐藏在 helper 中。

### 新增功能

如果一个功能同时包含复杂内部逻辑和核心用户流程：

1. 使用 Vitest 测试 calculation、validation、state transition、edge cases。
2. 使用 Playwright 测试关键的完整业务流程。
3. 不要把 Vitest 的完整 case matrix 重复到 Playwright。

<!-- FRONTEND_TEST_SETUP_END -->
````

---

## Vitest only

````md
<!-- FRONTEND_TEST_SETUP_START -->

## Testing

项目使用 **Vitest** 进行 Unit Test 和 module-level Integration Test。

使用 Vitest 测试：

- pure functions
- data transformation
- validation
- hooks
- services
- state / business logic
- focused component behavior
- edge cases
- error handling

测试文件优先与源码 colocate。

默认使用：

```text
*.test.ts
*.test.tsx
```

如果项目已有其他命名规范，遵循项目现有规范。

新增功能时，应针对重要逻辑、state transition、validation 和 edge cases 编写 deterministic tests。

如果需求明确依赖真实浏览器中的完整用户流程，不应把 Vitest 当作 E2E 测试的替代方案。

<!-- FRONTEND_TEST_SETUP_END -->
````

---

## Playwright only

````md
<!-- FRONTEND_TEST_SETUP_START -->

## Testing

项目使用 **Playwright** 进行 E2E 和业务流程测试。

使用 Playwright 测试：

- critical user journeys
- authentication / authorization
- cross-page workflows
- browser interactions
- core business workflows
- important integration paths

测试放在：

```text
tests/e2e/
```

并按照 business domain 组织。

优先使用 role、label、visible text 或稳定的 test id。

避免 brittle CSS / XPath selector。

保持测试 deterministic 和独立。

使用 fixture / helper 处理可复用的 setup 和机械性操作，但不要隐藏核心 business assertion。

不要把 Playwright 变成庞大的 Unit Test matrix。

默认使用：

```text
*.spec.ts
*.spec.tsx
```

如果项目已有其他命名规范，遵循项目现有规范。

<!-- FRONTEND_TEST_SETUP_END -->
````
