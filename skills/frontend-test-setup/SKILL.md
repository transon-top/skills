---
name: frontend-test-setup
description: 为前端项目配置 Vitest / Playwright 测试体系：建立 code behavior / user behavior 测试边界、文件组织与依赖脚本，并安全注入 CLAUDE.md 或 AGENTS.md。
disable-model-invocation: true
---

# Frontend Test Setup

## 目标

为项目建立可维护的前端测试体系，默认方案 **Vitest + Playwright**。

除非用户明确要求迁移或替换，保留项目现有测试基础设施。

## 核心边界

**code behavior** → Vitest；**user behavior** → Playwright。

> UI 大幅改版后测试仍然成立 → Vitest。
> 测试描述用户如何完成一个业务目标 → Playwright。

完整决策树与常见场景 → `references/testing-boundary.md`。

---

## 步骤

### 1. 检查项目现状

修改文件前读取（如果存在）：`package.json`、lockfile、`vitest.config.*`、`playwright.config.*`、Jest/Cypress 配置、源码目录、`CLAUDE.md`、`AGENTS.md`、已有测试目录。

**完成**：每项判断有结论——framework / build tool、package manager、TS/JS、已有测试框架、已有 scripts、当前文件组织方式、是否已有 E2E 环境。

已有配置先读再动：复用 / 补充 / 优化，或用户明确要求时重建。

### 2. 选择测试范围

用户未明确指定时交互选择：

```text
请选择需要配置的测试方案：
1. Vitest + Playwright（推荐，默认）
2. Vitest
3. Playwright
```

**完成**：方案已确认（或用户已明确指定，则不再询问）。

### 3. 按技术栈配置

按检测到的技术栈适配，不生成同质化配置。细节 → `references/vitest.md`、`references/playwright.md`。

- React + Vite：仅需 DOM 时用 `jsdom`，组件测试用 React Testing Library；Playwright 指向 Vite dev server
- React + Next.js：适配现有结构；`webServer` 按项目实际启动方式配置
- Vue + Vite：用 Vue 对应方案，不引入 React 专属依赖
- 未知：不猜测 framework-specific 配置，报告未确认项

### 4. 安装依赖并配置 scripts

只用项目现有 package manager（pnpm / npm / yarn / bun），不引入第二种；只装当前方案需要的。

保留已有 scripts，只补缺失：

```json
{ "scripts": { "test": "vitest", "test:unit": "vitest run", "test:e2e": "playwright test" } }
```

已有 `test` script 不覆盖：保留、加 `test:unit` / `test:e2e`，或按项目命名规范调整。

### 5. 确立文件组织

- **Vitest**：与源码 colocate，默认 `*.test.ts` / `*.test.tsx`
- **Playwright**：`tests/e2e/` 按 **business domain** 组织（auth / order / user），不镜像源码目录；`fixtures/`、`helpers/` 负责 setup 与机械操作，核心断言留在测试文件

示例与正反例 → `references/playwright.md`。

### 6. 生成测试规范

按所选方案生成，规范至少包含：工具选择与职责边界、文件组织与命名、mocking 原则、E2E 范围、fixture / helper 原则、避免重复测试、新增功能时如何判断。

模板 → `references/agent-instructions.md`。

### 7. 注入 CLAUDE.md / AGENTS.md

文件选择：优先检查执行 skill 所在路径下的 `.claude/CLAUDE.md`，存在则注入它；否则按项目根目录 `CLAUDE.md` / `AGENTS.md` 现状：

- 都不存在 → 创建 `CLAUDE.md`（用户要求 `AGENTS.md` 则创建它）
- 只存在一个 → 注入存在那个
- 都存在 → 查两份职责放最合适处，另一份只加短引用；已有 `docs/testing.md` 则完整规范放那里 + 引用

注入内容用 managed markers（`<!-- FRONTEND_TEST_SETUP_START/END -->`）；再次运行只替换 marker 之间内容，不追加新的一份。

**完成**：marker 只出现一次，用户原有内容未动。

### 8. 处理已有测试框架

Jest / Cypress / Testing Library 等：分析用途与复用、保留现有体系、报告中说明。迁移仅限用户明确要求。

### 9. 最终验证

- Vitest：`vitest run`
- Playwright：`playwright test --list`，环境允许再跑至少 1 个 smoke E2E

同时核验：config 可加载、scripts 可执行、test discovery 正常、marker 唯一、无意外改动用户文件。没有实际执行的命令不能声称执行成功。

### 10. 最终报告

方案、创建 / 修改文件、测试目录结构、CLAUDE/AGENTS 修改、实际执行验证及结果、保留的已有基础设施、需用户手动完成的步骤。
