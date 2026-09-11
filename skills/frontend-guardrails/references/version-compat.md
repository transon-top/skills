# 版本兼容

**版本由项目定，不由本技能定。** 正文不写安装目标版本，也不写 peer 范围——那些随上游变，写下来就开始过期。这里写**症状、原因、处置**：不随版本走，只在该组合被触发时才需要读。

## 两类核对手段

**包管理器能查到的直接查**：

```bash
pnpm view <包名> peerDependencies
```

**查不到的只能运行期自检**——工具没在 `package.json` 里声明约束时，包管理器拦不住错误组合，问题只在运行期暴露，而且往往不报错。这类一律**跑一次看数字**：扫到 0 个模块、报出 0 个问题，不可能是真的干净。

## ESLint：按项目主版本适配写法

生态里大量插件仍以 ESLint 9 为准适配，强推版本会连带撞上一堆 peer 冲突。

探测：`package.json` 的 `eslint` 字段、lockfile、`pnpm exec eslint --version`。各版本的写法差异 → `tools/eslint-plugins.md` 的「先探测版本，再选写法」一节。

**项目没有 ESLint 时**才需要选版本：装最新版，并在报告中写明选了哪个、为什么，交用户确认。

项目已有 ESLint 时，`@eslint/js` 的主版本必须与之对齐（`9.x` ↔ `eslint@9`，`10.x` ↔ `eslint@10`），且要显式 pin——包管理器默认会装最新版，pnpm 只打一行 warning 不报错。

## TypeScript：几处已实测的失配

| 工具 | 症状 | 原因 | 处置 |
| ---- | ---- | ---- | ---- |
| `dependency-cruiser` | 报 `0 modules cruised`，退出码正常 | 项目的 TS 主版本超出它能解析的范围。它**不在 `package.json` 里声明 `typescript`**，包管理器拦不住这个组合 | 升级 TS 主版本后跑一次 `depcruise --output-type err-long src`，模块数是 0 就别接这个工具，或与用户确认是否降 TS |
| `typescript-eslint` | 安装期 peer 警告，或解析时报不支持 | `peerDependencies` 里声明了 TS 上限 | `pnpm view typescript-eslint peerDependencies` 核对 |
| `@hey-api/openapi-ts` | 不装 `typescript` 直接崩（`Cannot read properties of undefined (reading 'AnyKeyword')`） | `typescript` 是硬 peer，不是可选项 | 同上。它的范围同时接受 TS 5 与 TS 6 |
| `react-doctor` | 无 | 它把 `typescript` 当**普通依赖**自带一份 | 无需处理 |

**TS 主版本比生态基线领先一个主版本以上时，逐个工具核对 peer 范围，别一次接完。**

已实测可用的组合：TypeScript 6 下 `typescript-eslint` 8.70（peer 上限 `<6.1.0`，在范围内）、`@hey-api/openapi-ts` 0.99、`dependency-cruiser` 18 都能跑（`35 modules, 62 dependencies cruised`，不是 0）。TS 6 下另有一处与版本相关的坑——`baseUrl` 已弃用，见 `tools/tsconfig.md`。

## pnpm 项目

pnpm 10+ 默认拦截依赖的 build script。被拦截时 **`pnpm exec` 与 `pnpm run` 会直接报错退出**（deps-status 检查失败），不是警告。装完依赖后若命令跑不起来，先看是不是这个。

设置要写在 **`pnpm-workspace.yaml`** 里，不是 `package.json` 的 `pnpm` 字段（后者已被忽略，只打一行警告）：

```yaml
# pnpm 11 的设置名是 allowBuilds（映射）；旧名 onlyBuiltDependencies 已不再读取
allowBuilds:
  esbuild: true
  unrs-resolver: true
```

`unrs-resolver` 是 `eslint-import-resolver-typescript` 的 native 依赖，`esbuild` 是 Vite 的。

## 另一类版本冲突：选项之间

除了包与包，还要看**选项与生成物**。已实测确认的一处：`@hey-api/openapi-ts` 生成的 client 与 `exactOptionalPropertyTypes` 不兼容，详见 `tools/tsconfig.md`。

引入代码生成前，先确认项目已有的严格选项设置；已有生成物的项目要开新严格选项时，先跑一次编译再决定。

## 出处

实测自 `dependency-cruiser@18.2.0`、`typescript-eslint@8.70.0`、`@hey-api/openapi-ts@0.99.0`、`react-doctor@0.9.13`（2026-09，对照各自 `package.json` 的依赖声明与夹具实跑）。
