# 版本兼容

**版本由项目定，不由本技能定。** 正文不写安装目标版本，也不写 peer 范围——那些随上游变，写下来就开始过期。这里写**症状、原因、处置**：只在该组合被触发时才需要读。

## 两类核对手段

**包管理器能查到的直接查**：

```bash
pnpm view <包名> peerDependencies
```

**查不到的只能运行期自检**——工具没在 `package.json` 里声明约束时，包管理器拦不住错误组合，问题只在运行期暴露，而且往往不报错。这类一律**跑一次看数字**：扫到 0 个文件、报出 0 个问题，不可能是真的干净。

## ESLint 主版本

**9.x 已于 2026-08 EOL**；主流插件正迁往 10，尾部插件仍以 9 为基线，**强推版本会连带撞上 peer 冲突**。按项目已有的主版本适配写法（→ `eslint.md`）。

**项目没有 ESLint 时**才需要选版本：装最新版，并在报告里写明选了哪个、为什么。

| 事实 | ESLint 9 | ESLint 10 |
| ---- | -------- | --------- |
| `eslint/config` 的 `defineConfig` | 9.22.0+ 才有 | 有 |
| `ESLINT_USE_FLAT_CONFIG=false` | 有效，legacy 可跑（带弃用警告） | **完全失效**，legacy 已移除 |
| `@eslint/js` 配对 | `9.x` 无 peer，宽松 | `10.x` 硬要求 `eslint@^10`，装错**安装期**报错 |

**`@eslint/js` 的主版本必须与项目 eslint 对齐，且要显式 pin。** 实测：项目用 `eslint@9.39` 时直接 `pnpm add -D @eslint/js` 会装成最新主版本——pnpm 只在末尾打一行 `[WARN] Issues with peer dependencies found`，不报错（npm 会 ERESOLVE 失败）。这种"装上了但配错"的状态没有即时反馈。

## TypeScript 失配

| 工具 | 症状 | 处置 |
| ---- | ---- | ---- |
| `typescript-eslint` | 安装期 peer 警告，或解析时报不支持 | peer 里声明了 TS 上限，`pnpm view` 核对 |
| `eslint-plugin-react-doctor` | 无 | 它**完全不声明 peerDependencies**（连 key 都没有）——装不冲突，也没有保护；ESLint 主版本不受约束 |
| `eslint-import-resolver-typescript` | boundaries 静默失效 | 必须 pin 精确版本，理由见 `boundaries.md` 坑 B |

**TS 主版本比生态基线领先一个主版本以上时，逐个工具核对 peer 范围，别一次接完。**

## pnpm 项目

pnpm 10 起默认拦截依赖的 build script，装完只**警告**；**11+（含当前 12.x）才升级成硬报错**——`pnpm exec` / `pnpm run` 触发 deps 检查后直接退出。装完依赖后若命令跑不起来，先看是不是这个。

设置写在 **`pnpm-workspace.yaml`**，不是 `package.json` 的 `pnpm` 字段（后者已被忽略，只打一行警告）：

```yaml
# 设置名是 allowBuilds（10.26+ 引入）；11+ 起旧名 onlyBuiltDependencies 不再被读取
allowBuilds:
  esbuild: true
  unrs-resolver: true
```

`unrs-resolver` 是 `eslint-import-resolver-typescript` 的 native 依赖，`esbuild` 是 Vite 的。
