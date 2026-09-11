# 版本兼容

**版本由项目定，不由本技能定。** 本技能任何地方写的版本号都只是"全新项目时的参考默认值"，不是要求项目迁就的目标。

## ESLint：按项目主版本适配写法

生态里大量插件仍以 ESLint 9 为准适配，强推版本会连带撞上一堆 peer 冲突。

探测：`package.json` 的 `eslint` 字段、lockfile、`npx eslint --version`。各版本的写法差异 → `tools/eslint-plugins.md` 的「先探测版本，再选写法」一节。

**项目没有 ESLint 时**才需要选版本：装与项目其余工具链兼容的那个，并在报告中写明选了哪个、为什么，交用户确认。

`@eslint/js` 的主版本必须与项目 ESLint 主版本一致（`9.x` ↔ `eslint@9`，`10.x` ↔ `eslint@10`），且要显式 pin——包管理器默认会装最新版，pnpm 只打一行 warning 不报错。

## TypeScript：工具链要求不一致

| 工具 | 要求 |
| ---- | ---- |
| `typescript-eslint@8.70.0` | `>=4.8.4 <6.1.0` |
| `dependency-cruiser@18` | `>=2.0.0 <7.0.0`——装 TS 7 会**静默 cruise 到 0 个模块**且不报错 |
| `react-doctor@0.9.13` | `>=5.0.4 <6` |
| `@hey-api/openapi-ts` | `>=5.5.3`（硬 peer，不装 CLI 直接崩） |

**TS 7 目前整条链都不支持**；TS 6 也只有部分工具接受。项目用 TS 7 时，`dependency-cruiser` 要么不接、要么和用户确认是否降级；`react-doctor` 同理。

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
