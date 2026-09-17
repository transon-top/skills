# knip、jscpd 与测试体系

## 测什么用哪个工具

**Vitest 管"逻辑是否正确"，Playwright 管"用户是否真的可以完成这件事"。**

函数 / module / hook / 单组件的行为 → Vitest；描述用户完成一个业务目标（登录、下单、改设置）、跨多个 route、依赖真实运行中的应用 → Playwright；需要大量 edge case → Vitest，E2E 只覆盖有代表性的关键路径。

两层可以覆盖同一个大功能，但**不重复完整的测试矩阵**：30 个优惠券计算 case 归 Vitest，Playwright 只留 1 条"用优惠券完成结算"的流程。

---

## Vitest

### 配置

- **优先复用项目现有的 Vite 配置**（`mergeConfig` 或 `defineConfig` 内引用），没有 Vitest 配置时才创建
- **environment 最小化**：只有需要 DOM API 的测试用 `jsdom` / `happy-dom`，纯逻辑保持默认 `node`。DOM 环境每个测试文件初始化开销最大，全局 jsdom 是为了省事，不是合理配置
- 需要多环境时用 `test.projects` 按 include glob 分组（Vitest v4 方案，`environmentMatchGlobs` 已移除）
- **mock 隔离**：`restoreMocks: true`（恢复 spy 实现）或 `mockReset: true`（清 history + implementation）至少开一个，防测试间泄漏
- `coverage.include: ['src']` 用**项目根相对路径**，不是含糊的 contains

### 文件组织与写作

与源码 colocate，`*.test.ts` / `*.test.tsx`（`src/utils/formatPrice.test.ts` 挨着 `formatPrice.ts`），源码重构或删除时测试跟着走。

测试要 **tight**：快、deterministic、大量 case、失败原因一眼可定位。组件测试关注 observable behavior（render → user interaction → observable result），不测 private function、内部 state 与 DOM 结构。

Mock 只用于 external boundary（网络、昂贵依赖、非确定性来源）。**不要为了让断言更容易而 mock 被测试的核心逻辑。**

---

## Playwright

### 配置

```ts
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,          // CI 里混进 .only 直接失败
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
})
```

**`baseURL` 与 `webServer.url` 必须一致**（协议 / host / 端口），不一致会在 smoke E2E 处以 404 暴露。`reuseExistingServer: !process.env.CI` 让本地复用已启动的 dev server、CI 强制自己起。复用项目现有的启动命令；桌面默认 Chromium 足够时只配一个 project。

### 文件组织

`*.spec.ts`，**按业务域组织，不镜像源码目录**（`tests/e2e/order/create-order.spec.ts`）。一个业务流程跨多个页面时（商品列表 → 详情 → 购物车 → 结算）归入同一业务域文件，**不要**按页面拆成 `LoginPage.spec.ts` / `OrderPage.spec.ts`。

### 写作

Locator 优先级：role → label → visible text → 稳定 test id，避免依赖 DOM 结构的 CSS / XPath。Playwright 的 locator 自带 auto-wait，配合 web-first assertions（`expect(locator).toBeVisible()`）轮询等待——**不手写 `waitForTimeout`**。

Fixture 管可复用的 setup，helper 减少机械重复（登录、测试数据）。**核心业务断言留在测试文件里**：

```ts
await createOrder();                                        // helper 只做操作
await expect(page.getByText('订单创建成功')).toBeVisible();  // 断言在测试里
```

测试间保持隔离：共享 setup 放 `test.beforeEach`，不在 test 之间传递状态。

### 验证

```bash
pnpm exec playwright test --list                     # config 加载 + discovery，预期用例一一列出
pnpm exec playwright install --with-deps chromium    # 缺失时首次运行报 executable 找不到
```

缺文件说明 `testDir` 不匹配。**浏览器默认不装**——几百 MB、失败率高，用 `AskUserQuestion` 问用户是否继续；不装在报告里标注未验证。

---

## knip

找死代码：没人 import 的文件、没人用的 export、不再需要的依赖。

```bash
pnpm add -D knip
pnpm create @knip/config
```

**没有 `knip --init`**——初始化走独立脚手架包。脚手架的 `$schema` 里 `@6` 是**主版本号，要与项目实际装的 knip 主版本对齐**。

### 常用键

配置键全部 camelCase。支持 `knip.json` / `knip.jsonc` / `knip.config.ts` 等，或 `package.json` 的 `knip` 字段。

| 键 | 说明 |
| -- | ---- |
| `entry` / `project` | 入口 / 纳入分析的文件 glob |
| `ignore` | **任意 issue 类型**都排除的文件 glob |
| `ignoreIssues` | 按文件 glob 忽略指定类型：`{ "src/generated/**": ["exports", "types"] }` |
| `ignoreDependencies` | 包名列表，支持正则字符串 |
| `rules` | 各 issue 类型设 `"error"` / `"warn"` / `"off"` |

**首次接入 `rules` 各项设 `"warn"`。** **monorepo 最容易踩的一处**：多 workspace 项目里**根层的 `entry` / `project` 会被忽略**，必须挪进 `workspaces["."]`。

### 退出码与假绿

发现 issue 时退出码 1；`--no-exit-code` 让它不因 issue 失败；`--max-issues <N>` 放宽到 N 个才失败。

**`--no-exit-code` 不是"永远返回 0"。** 配置文件在**顶层有副作用**时（动态 `import()` 重量级依赖、读环境变量后发请求、`await` 数据库连接），jiti 加载会抛，knip 在判断该参数**之前**直接 `exitCode = 2` 返回（`hasConfigLoadErrors` 那一支），而结果照常打印——报错与报告同时出现。

处置原则是**先证明结果仍然有效，再决定要不要修**：报错只发生在 `resolveConfig` 那一步，项目文件的 import 图走另一条路径，通常是完好的。两条哨兵：① 只被该 config 引用的文件**不应**出现在 unused files 里；② 往该 config 加一行指向不存在模块的 import，knip 应报 `Unresolved imports`。都成立就把报错与退出码含义写进项目的已知问题，不要静默 `|| true`。

**`--fix` 首次接入不要跑**——它会批量删导出，在基线未立时风险太大。

### 验证

```bash
pnpm exec knip --no-exit-code
```

确认配置被解析（不是静默回退）、有实际 issue 计数、**没有把 `src` 整个列成未使用**（出现就说明 `entry` 配错了）。`Configuration hints` 段落会提示多余的 `ignore` / `entry` 项，首次接入按它清一遍。

---

## jscpd

找文本级重复。v5 是 Rust 重写，自包含二进制。

配置文件 **`.jscpd.json`**，**只在当前工作目录查找，不向上遍历父目录**。**必须 camelCase**，且有三个文档没写清的坑：

1. **类型错误会让整个配置文件被静默丢弃**，回退到全默认值（未知键只是警告，类型错了是整份作废）
2. **`failOnNewClones` 是数字不是布尔**（`0` = 零容忍）
3. **`skipComments` 键在 v5 不存在**，配置里用 `"mode": "weak"`

### 关键项

| 键 | 默认值 | 含义 |
| -- | ------ | ---- |
| `path` | `[]` | 扫描路径数组 |
| `minTokens` / `minLines` | `50` / `5` | 克隆的最小 token / 行数 |
| `ignore` | `[]` | **文件级 glob** 忽略 |
| `ignorePattern` | `[]` | **代码级正则**，匹配到的 token 被跳过 |
| `threshold` | `null` | 最大重复百分比，超过则 exit 1 |
| `exitCode` | `null`（默认 1） | 发现 clone 就以此码退出 |

`--ignore`（文件 glob）与 `--ignore-pattern`（代码正则）是两个不同选项——npm README 的选项表把它们混为一谈，以 `--help` 为准。CLI 上的 `--ignore-pattern` 按逗号切分，正则里含逗号（`{1,3}`、`[,;]`）必须放进配置文件。

### `ignore` 里先排除三类

构建产物与依赖（`**/node_modules/**`、`**/.next/**`、`**/dist/**`）、**生成文件**（`**/*.d.ts`、类型生成物、`DO NOT MODIFY` 的脚手架）、测试夹具。

生成文件那类最容易漏：**框架生成的文件同源同模板，互相重复是结构必然**，且人工修不了、下次生成还会回来。看报告里克隆的**两端路径**——都在生成目录内就加 `ignore`；一端是生成、一端是手写，那才可能是真信号。

### markup 与 logic 用不同阈值

重复的 JSX 可能是有意的，重复的业务逻辑更可能成为维护问题。**jscpd 没有 per-format 阈值**，实现方式只能是跑两次：

```bash
# logic：严格
pnpm exec jscpd . --format javascript,typescript --threshold 3 --ignore "**/*.test.ts"

# markup：宽松
pnpm exec jscpd . --format markdown,html,css --threshold 15
```

两条命令各占一个 script，或合成一条 `&&` 串联。

### 退出码与假绿

**扫描 0 个文件时仍 exit 0**，只打印 `Warning: jscpd analyzed no files`。这是这个工具最容易**假绿**的地方。

**没有 `--no-exit-code`**（传了报 `unexpected argument`）。要让发现克隆也不阻塞，只能配置里写 `"exitCode": 0`，或把该命令排除出失败路径。注意 `threshold` 超限的 exit 1 **不受 `exitCode` 影响**——纯报告就别在配置里设 `threshold`。

### 验证

```bash
pnpm exec jscpd . --reporters console,silent
```

确认**分析的文件数非 0**、克隆计数是真实数字、配置已生效（改一个 `minTokens` 看计数是否变化）。

### 局限

只找**文本级**重复。两份分别写出来、规则相同但看着完全不同的实现看不见——语义重复仍需人工 review。
