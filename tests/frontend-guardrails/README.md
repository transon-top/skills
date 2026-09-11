# frontend-guardrails 夹具

验证 `frontend-guardrails` skill 的产出是否成立。

夹具是**跑完 skill 之后的 golden 产物**——真实的项目、真实的依赖、故意埋的违规。`run.sh` 不重新执行 skill，只断言那份产物仍然有效。

## 跑

```bash
# 首次：两个夹具都要装依赖
(cd tests/frontend-guardrails/fixture-a && pnpm install)
(cd tests/frontend-guardrails/fixture-b && pnpm install)

# 断言
pnpm run test:skills
```

## 两个夹具

| 夹具 | 技术栈 | 覆盖 |
| ---- | ------ | ---- |
| `fixture-a` | React 19 + Vite + TS 5.9 + Vitest + OpenAPI spec + **ESLint 9** | 四簇全开：契约生成、严格 tsconfig、全部 ESLint 插件、架构边界、死代码/重复/变异测试、规范注入 |
| `fixture-b` | 纯 TS + Node + **ESLint 10** | 降级路径：非 React、无 spec、无测试框架时**不生成**对应配置；同时验证「按项目版本适配」不升降 ESLint |

两个夹具的 ESLint 主版本刻意不同，用来锁住「版本由项目定」这条约束。

## 埋的违规与对应断言

夹具里的违规是**必须被抓到**的，否则「没报错」什么都证明不了。

| 位置 | 违规 | 应由谁抓到 |
| ---- | ---- | ---------- |
| `fixture-a/src/services/user-service.ts` | service 层 import component 层 | `boundaries/dependencies` |
| `fixture-a/src/hooks/use-user-name.ts` | 派生状态塞进 `useEffect` | `react-you-might-not-need-an-effect` |
| `fixture-a/src/App.tsx` | `<img>` 缺 alt、div 绑 onClick | `jsx-a11y` |
| `fixture-a/src/lib/format-price.test.ts` | `.only` 未删、测试无断言 | `vitest/no-focused-tests`、`vitest/expect-expect` |
| `fixture-a/src/lib/format-price.ts` × `src/utils/price-formatter.ts` | 两份几乎相同的实现 | `jscpd` |
| `fixture-a/src/dead-module.ts` | 无人 import | `knip` |
| `fixture-a/probes/strictness-probe.ts` | 未检查索引访问、显式传 `undefined` | `tsc`（TS2322 / TS2375） |
| `fixture-b/src/services/report-service.ts` | service 层 import cli 层 | `boundaries/dependencies` + `dependency-cruiser` |
| `fixture-b/src/orphan.ts` | 无人 import | `knip` |

**探针设计**：`probes/` 不在主 tsconfig 里，`typecheck:probe` 用独立的 `tsconfig.probes.json` 显式开启严格选项。这样 `check` 能保持绿色，而 flag 的语义仍有回归覆盖。

## 覆盖不到的

- **`react-doctor install` 的 agent-skill 写入路径**未验证：夹具走的是 `--scope full` 扫描模式。`install` 会往多个 agent 目录（含 `.claude/skills/`）写文件，且 `--agent-hooks` 会写 `.claude/settings.json`——本 skill 明确不碰后者
- **ESLint 10 + jsx-a11y 的组合**未覆盖：jsx-a11y 在 ESLint 10 下需要 `--legacy-peer-deps`，但 ESLint 10 的夹具是非 React 项目
- **monorepo 分支**未覆盖
- **`legacy .eslintrc` 分支**未覆盖

## 实测发现

这套夹具在首次跑通时抓出的问题（每条都已写回对应 reference）：

1. **`@hey-api/openapi-ts` 生成的 client 与 `exactOptionalPropertyTypes` 不兼容**——十余处 TS2379 / TS2375，生成目录被 import 所以 `exclude` 无效
2. **Stryker 的 `.stryker-tmp/sandbox-*/` 会被 lint**——项目副本带 `@ts-nocheck`，不排除则 lint 从 27 problems 变 397 problems / 116 errors
3. **Stryker 的 `plugins` 自动加载在 pnpm 布局下失效**——必须显式写 `["@stryker-mutator/vitest-runner"]`
4. **`@eslint/js` 主版本不会自动跟随项目 ESLint**——pnpm 只警告不报错，装成 v10 配 ESLint 9
5. **boundaries 的哨兵规则对未声明的本地目录误报**——生成目录 `@/client` 必须也声明成 element
6. **`sonarjs/no-implicit-dependencies` 对路径别名全部误报**、`sonarjs/file-header` 纯噪声
7. **pnpm 10+ 拦截 build script 会让 `pnpm exec` / `pnpm run` 直接失败**，且设置名在 pnpm 11 改为 `allowBuilds`、位置改为 `pnpm-workspace.yaml`

## 维护

夹具是 golden 产物，**改动夹具里的配置文件等同于改动 skill 的产出预期**。改完必须重跑 `pnpm run test:skills`。

新增断言时优先覆盖"静默失效"类的失败——全绿但其实什么都没查，是这套工具最危险的失败模式。
