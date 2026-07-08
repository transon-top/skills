# 检查命令发现 — 回退策略

当 `package.json` 的 `scripts` 中无脚本名命中时使用。按类型逐一执行以下回退链，每类取首个命中项。

## 命令内容分析

名称未命中时，扫描所有脚本的 `command` 字符串，按工具签名推断用途：

**类型检查：** 命令含以下任一工具名 → 视为类型检查脚本
- `tsc`、`vue-tsc`、`tsc-files`

**代码质量：** 命令含以下任一工具调用 → 视为代码检查脚本
- `eslint`、`oxlint`
- `biome lint`
- `biome check`（且不含 `--write` 标志）

**格式化：** 命令含以下任一工具调用 → 视为格式化脚本
- `prettier`
- `biome format`
- `biome check --write`
- `dprint fmt`

取 `scripts` 声明顺序中首个命中项（声明顺序即项目优先级）。

## 配置文件回退

所有脚本均未命中某类型时，检测项目配置文件推断工具链：

| 检测到 | 推断命令 |
|--------|---------|
| `tsconfig.json` | `npx tsc --noEmit` |
| `.eslintrc.*` / `eslint.config.*` | `npx eslint .` |
| `biome.json` | `npx biome check .`（质量）/ `npx biome format --write .`（格式化） |
| `.prettierrc*` | `npx prettier --write .` |

## 合并命令扫描

额外检测 `scripts` 中涵盖 ≥2 类的综合指令：

- 命令含 `&&` 或 `;` → 按分隔符拆解，对各部分执行命令内容分析
- 示例：`"check:all": "tsc --noEmit && eslint . && prettier --check ."` 同时覆盖类型检查、代码质量、格式化三类
- 作为可选项单独展示
- 已由前序步骤单独覆盖的类型，不再从合并命令中重复提取
- 如用户选择合并命令，以其替代对应的单独命令执行
