# 配置诊断

配置完成后按此检查。原则：**命令实际执行并核对输出**——没执行过的命令不能声称通过；无法执行的项目（无浏览器、无网络）列入最终报告，明确标注未验证。

## 命令验证

### Vitest

- `npx vitest run <至少一个真实测试文件>`（或项目 package manager 对应写法）：验证 config 加载、该文件被收集且通过。全量 `vitest run` 可作参照——已有失败测试属项目状态，不是配置问题的判据，列入报告。
- 核对收集数（Test Files / Tests 总数非 0）。数量为 0 说明 include 模式与文件组织不一致。
- 需要 DOM 的组件测试实际跑过（不是 pure node 测试），确认 environment 生效。

### Playwright

- `npx playwright test --list`：config 加载 + discovery，所有预期 `.spec.ts` 一一列出。缺文件说明 testDir / include 不匹配。
- 用到 `webServer` 时：`baseURL` 与 `webServer.url` 必须一致（协议 / host / 端口），不一致会在 smoke E2E 处以 404 暴露。
- 浏览器：`npx playwright install --with-deps <browser>`，缺失时首次运行报 executable 找不到；`--dry-run` 可先查看安装计划。
- 环境允许时跑至少 1 个 smoke E2E（登录、首页加载等）。

## 合理性 checklist

对每项给出结论：**通过 / 不适用 / 需修改**（需修改则改完重跑命令验证）。逐项过，不留"看起来没问题"。

### Vitest

- **environment 最小化**：只有需要 DOM API 的测试才用 `jsdom` / `happy-dom`；纯逻辑保持默认 `node`。DOM 环境每个测试文件初始化开销最大（官方 improving-performance），全局 jsdom 是为了省事，不是合理配置。
- **多环境分组**：需要不同 environment 的测试用 `test.projects` 按 include glob 分组（Vitest v4 方案，`environmentMatchGlobs` 已移除）。
- **mock 隔离**：`restoreMocks: true`（恢复 spy 实现）或 `mockReset: true`（清 history + implementation）至少一个，防测试间 mock 泄漏。
- **setupFiles**：polyfills / custom matchers 集中于 setup 文件，不散落在各测试。
- **coverage**：`coverage.include: ['src']` 为项目根相对路径，不是含糊的 contains。
- **版本匹配**：vitest 与项目 vite 版本兼容，同装 devDependencies；复用现有 vite 配置而非重写。
- **文件组织一致**：include / exclude 模式与 colocate 组织一致（colocate 默认收集 `src/**` 下的 `*.test.*`）。

### Playwright

- **testDir** 指向业务域组织目录（`tests/e2e`），与文件命名一节一致。
- **baseURL / webServer 一致性**：如上。
- **CI 差异化配置**：`forbidOnly: !!process.env.CI`、`retries: process.env.CI ? 2 : 0`、`workers: process.env.CI ? 1 : undefined`、`trace: 'on-first-retry'`。
- **webServer**：`reuseExistingServer: !process.env.CI`（本地复用已启动 dev server，CI 强制自己起）。
- **隔离**：每个 test 独立 browser context（默认），setup 用 `test.beforeEach`，测试间无顺序依赖——检查是否存在"依赖上一个 test 状态"的写法。
- **浏览器项目**：桌面默认 Chromium 足够时只配一个；需要跨浏览器再加 firefox / webkit / channel（chrome、msedge），按需扩展。
- **E2E 范围**：确认没有把单元测试的 edge case 矩阵搬进 E2E（边界见 `testing-boundary.md`）。
