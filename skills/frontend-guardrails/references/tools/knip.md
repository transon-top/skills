# knip

找死代码：没人 import 的文件、没人用的 export、不再需要的依赖。

当前版本 **6.35.1**。包名 `knip`。

## 安装与初始化

```bash
npm i -D knip
npm init @knip/config
```

**注意：没有 `npx knip --init` 这个命令。** 初始化走独立脚手架包 `@knip/create-config`（`npm init @knip/config` / `pnpm create @knip/config` / `bun create @knip/config`）。

脚手架会生成 `knip.json`、往 `package.json` 写入 `"knip": "knip"` script、并装好 `typescript` 与 `@types/node`：

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "tags": ["-lintignore"]
}
```

## 配置文件

支持 `knip.json`、`knip.jsonc`、`.knip.json`、`.knip.jsonc`、`knip.ts`、`knip.js`、`knip.config.ts`、`knip.config.js`，或 `package.json` 的 `knip` 字段。用 `-c/--config <file>` 指定其他路径。

**配置键全部 camelCase。**

### 常用键

| 键 | 说明 |
| -- | ---- |
| `entry` | 入口文件 glob |
| `project` | 纳入分析的文件 glob |
| `ignore` | **任意 issue 类型**都排除的文件 glob |
| `ignoreDependencies` | 包名列表，**支持正则字符串**（`"@org/.+"`） |
| `ignoreExportsUsedInFile` | 布尔，或对象。对象子键恰好是 `class` / `enum` / `function` / `interface` / `member` / `type` / `variable` |
| `ignoreIssues` | 按文件 glob 忽略指定 issue 类型：`{ "src/generated/**": ["exports", "types"] }` |
| `rules` | 值为 `"error"` / `"warn"` / `"off"` |
| `tags` | `["-lintignore"]` 排除、`["+custom"]` 包含 |
| `workspaces` | 对象，key 是目录 glob 或包名；根 workspace 用 `"."` |

`rules` 可配的 issue 类型：`binaries`、`catalog`、`catalogReferences`、`cycles`、`dependencies`、`devDependencies`、`optionalPeerDependencies`、`duplicates`、`enumMembers`、`namespaceMembers`、`exports`、`files`、`nsExports`、`nsTypes`、`types`、`unlisted`、`unresolved`。

### monorepo

knip 自动从 `package.json` 的 `workspaces`、`pnpm-workspace.yaml`、`lerna.json`、Bun 等探测 workspace。

**多 workspace 项目里，根层的 `entry` / `project` 会被忽略**——必须挪进 `workspaces["."]`。这是最容易踩的一处。

## 配置示例

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "entry": ["src/index.ts", "scripts/*.ts"],
  "project": ["src/**/*.{ts,tsx}", "!**/*.test.ts"],
  "ignore": ["**/generated/**"],
  "ignoreDependencies": ["husky", "lint-staged"],
  "ignoreExportsUsedInFile": true,
  "includeEntryExports": false,
  "tags": ["-lintignore"],
  "rules": {
    "dependencies": "error",
    "unlisted": "error",
    "exports": "warn",
    "types": "warn",
    "duplicates": "off"
  }
}
```

按 SKILL.md 的基线策略，首次接入把 `rules` 里各项设成 `"warn"`；跑一段时间确认无误报后再升 `"error"`。

## 退出码

- 发现 issue 时**退出码 1**
- 永远返回 0：`--no-exit-code`
- 放宽到 N 个才失败：`--max-issues <N>`（默认 0）

`ignore` 列表增长是"检查正在失去覆盖"的信号，要定期复查。每个被忽略的路径就是被明确告知不要检查的一部分代码。

## 常用命令

```bash
npx knip                # 全量
npx knip --no-exit-code # 只报告
```

`--fix` 存在（`-f, --fix`，会改文件），配套 `--fix-type`、`--allow-remove-files`、`-F/--format`。**首次接入不要跑 `--fix`**——它会批量删导出，在基线未立时风险太大。

## 验证

```bash
npx knip --no-exit-code
```

确认：配置被解析（不是静默回退）、报告里有实际的 issue 计数、没有把 `src` 整个列成未使用（若出现，通常是 `entry` 配错）。

## 通用工具盖不到的两个缺口

见 `../detect.md`。简述：

1. **可达性 ≠ 被 import 过**——knip 问"有没有被 import"，自写脚本问"从运行入口出发能不能到达"
2. **过期的 `vi.mock()`**——knip 不管

自写检测器**必须自带测试**（用一个故意写死的文件验证它能找到）。

## 出处

要点 8 的推荐工具。配置键与语义取自官方 schema `https://unpkg.com/knip@6/schema.json`。
