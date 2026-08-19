# 检查范围限定 — 只查未提交代码

步骤 2 的判定细节。核心原则：lint/format 按文件跑（工具原生支持文件参数），typecheck 全量（项目级类型视图）。

## lint-staged 优先

检测到以下任一即直接 `npx lint-staged`——它内部完成 diff 计算、文件过滤与暂存恢复：

- `package.json` 的 `lint-staged` 字段
- `.lintstagedrc*` / `lint-staged.config.*`

只做存在性检测，不解析配置内容。

## 按工具判定

| 工具 | 可限定 | 传参形态 |
| ------ | ------ | ------ |
| eslint | ✅ | `npx eslint <files>`，存在不匹配文件报错时加 `--no-error-on-unmatched-pattern` |
| oxlint | ✅ | `npx oxlint <files>` |
| biome check | ✅ | `npx biome check <files>` |
| prettier | ✅ | `npx prettier --write <files>` |
| dprint | ✅ | `npx dprint fmt <files>` |
| tsc-files | ✅ | `npx tsc-files --noEmit <files>` |
| tsc / vue-tsc | ❌ 全量 | import 链会拖入全项目，按文件限定无意义且漏报 |

## 边界

- `git diff HEAD --name-only` 不含 untracked 文件——untracked 不进 commit，无需检查
- 工具自身 ignore 机制生效（eslint ignore 配置、`.prettierignore`），传文件列表时被忽略文件自动跳过
- monorepo：lint/typecheck 若为 turbo、workspace 等聚合指令，保持全量（无法按文件限定）
