# Playwright 配置规范

## 配置原则

- 默认将 `playwright.config.ts` 放在项目根目录。
- 如果项目已有 Playwright 配置，先读取再修改。
- 需要自动启动本地应用时使用 `webServer`。
- 复用项目现有 package manager 和启动命令。
- 集中管理 `baseURL`，与 `webServer.url` 保持协议 / host / 端口一致。
- 使用 Playwright fixture 提供隔离的 browser context（每个 test 默认独立 context）。
- 检查浏览器是否已安装：`npx playwright install --with-deps <browser>`。

## 推荐 config 结构

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

按需调整：跨浏览器再加 firefox / webkit / channel；并行 shard（`--shard=i/n`）用于 CI 分发。

## 文件命名

默认：

```text
*.spec.ts
*.spec.tsx
```

推荐按 business domain 组织：

```text
tests/e2e/
├── auth/
│   └── login.spec.ts
├── order/
│   └── create-order.spec.ts
└── user/
    └── update-profile.spec.ts
```

一个业务流程可能跨多个页面（商品列表 → 详情 → 购物车 → 结算 → 订单），归入同一业务领域文件，如 `create-order.spec.ts`。

不按页面 / route 逐个拆文件（`LoginPage.spec.ts`、`OrderPage.spec.ts`）——那是对源码目录的镜像。

## Locator

优先级：

1. role
2. label
3. visible text
4. 稳定的 test id

尽量避免依赖 DOM 结构的 brittle CSS / XPath selector。

Playwright 的 locator 自带 auto-wait（点击 / 填充前自动等待元素可交互），配合 web-first assertions（`expect(locator).toBeVisible()` 轮询等待），不要手写 `waitForTimeout` / `waitForSelector`。

## 测试结构

每个 E2E test 应该描述一个明确的用户 / 业务结果。

可以自然遵循：

```text
Given
When
Then
```

但不要为了形式而过度封装。

测试间保持独立（isolation）：共享 setup（如登录）放 `test.beforeEach`，不在 test 之间传递状态。

## Fixtures / Helpers

Fixture 负责可复用的测试 setup。

Helper 负责减少机械性的重复操作：提供测试数据、登录等通用 setup。

核心 business assertion 留在测试文件中。不推荐把断言包进 helper：

```ts
// 不推荐：断言藏在 helper 里
await createOrderAndAssertSuccess();

// 推荐：helper 只做操作，断言留在测试文件
await createOrder();

await expect(page.getByText('订单创建成功')).toBeVisible();
```

## E2E 范围

E2E 应该：

- 数量相对少
- 业务价值高
- 关注关键用户路径
- 保持 deterministic
- 保持 test isolation

不要把 Unit Test 的大量 edge cases 全部搬到 Playwright。
