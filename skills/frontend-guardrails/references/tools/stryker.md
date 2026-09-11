# StrykerJS（变异测试）

测你的测试：代码被改坏了，测试会不会发现。

当前版本 **10.0.0**。配 Vitest 需要 `@stryker-mutator/vitest-runner`（同为 10.0.0，peerDeps 要求 `vitest >=2.0.0`）。

## 安装与初始化

```bash
npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner
npx stryker init
```

`stryker init` 全交互式，会问 "What file type do you want for your config file?"：

- 选 `JSON`（**默认**）→ 写 `stryker.config.json`，自带 `$schema`
- 选 `JavaScript` → 写 `stryker.config.mjs`，带 `// @ts-check` + JSDoc，并自动跑一次 `prettier --write`

支持的文件名共 16 个：`stryker.config.{json,js,mjs,cjs}`、`stryker.conf.{json,js,mjs,cjs}`、`.stryker.config.*`、`.stryker.conf.*`。**裸 `stryker.json` / `stryker.js` 不支持**（后缀只有 `.conf` / `.config`）。

**配置键全部 camelCase**，CLI 长选项也是（`--ignoreStatic`、`--incrementalFile`），不是 kebab-case。

## 配置

```js
// stryker.config.mjs
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  mutate: ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts"],
  reporters: ["clear-text", "progress", "html", "json"],
  coverageAnalysis: "perTest",
  thresholds: { high: 80, low: 60, break: null },
  ignoreStatic: true,
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",
  vitest: { configFile: "vitest.config.ts" }
};
```

JSON 版本头部加：

```json
{ "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json" }
```

**`plugins` 必须显式声明。** 文档说"装了 `vitest-runner` 就会自动加载所有 `@stryker-mutator/*`"，实测在 pnpm 布局下**不成立**，报：

```text
Cannot find TestRunner plugin "vitest". In fact, no TestRunner plugins were loaded.
Did you forget to install it?
```

加上 `plugins: ["@stryker-mutator/vitest-runner"]` 后正常。

## 不要设失败阈值

**`thresholds.break` 保持 `null`。** 这是本技能对这个工具的硬性配置。

三个阈值项的含义不同：

- `high`（默认 80）、`low`（默认 60）：**只影响报告呈现**（clear-text 表格颜色），**不让构建失败**
- `break`（默认 `null`）：分数低于它则退出码非零

设了 `break` 就会出现"为杀变异体而写"的测试——equivalent mutants 永远存在，有价值的测试可能完全不推动分数，分数一旦成为目标，测试就开始为数字服务而不是为判断服务。

源码在 `break: null` 时的输出原话：*"No breaking threshold configured. Won't fail the build no matter how low your mutation score is."*

## 配置项

| 键 | 默认值 | 说明 |
| -- | ------ | ---- |
| `mutate` | 猜 `src`/`lib` 下的 js-like 文件 | 要变异的**生产代码**，支持 glob |
| `testRunner` | `"command"` | 配 vitest → `"vitest"` |
| `reporters` | `["clear-text","progress","html"]` | |
| `coverageAnalysis` | `"perTest"` | |
| `ignoreStatic` | `false` | 忽略静态变异体（只在文件加载时执行，代价高），**建议开** |
| `incremental` | `false` | 增量模式 |
| `incrementalFile` | `"reports/stryker-incremental.json"` | |
| `ignorePatterns` | `[]` | 注意键名是 `ignorePatterns`，不是 `ignore` |
| `tempDirName` | `".stryker-tmp"` | |
| `cleanTempDir` | `true` | |

## 限定范围

**StrykerJS 没有 `--since`。** 官方提供的是四个正交机制：

1. `-m, --mutate <files>` —— 限定变异文件子集，逗号分隔 / glob
2. `-t, --testFiles <files>` —— 只跑指定测试文件
3. `--incremental` + `--incrementalFile <file>` —— 存上次结果，下次按 diff 复用
4. `--force` —— 即使有 incremental 文件也全部重跑；`--dryRunOnly` —— 只跑初始测试，用于验证配置

`--incremental` 的复用条件：变异体被 Killed 且凶手测试仍存在且未变；或变异体未被 Killed 且无新测试覆盖、测试未变。

只跑改动过的文件（**本技能构造，非官方文档原文**）：

```bash
CHANGED=$(git diff --name-only --diff-filter=ACMR HEAD~1 -- 'src/**/*.ts' 'src/**/*.tsx' | tr '\n' ',')
npx stryker run --mutate "$CHANGED" --incremental --incrementalFile reports/stryker-incremental.json
```

`--incremental` 配合持久化的 `incrementalFile` 才有意义——文件被清掉就等于每次全量。

## `.stryker-tmp/` 必须排除出所有检查

跑过一次 stryker 后，项目里会留下 `.stryker-tmp/sandbox-*/`——**整个项目的副本**，且每个文件被加了 `@ts-nocheck`。

不排除的后果（实测）：fixture 的 lint 从 27 problems / 0 errors 变成 **397 problems / 116 errors**，全部是 `@typescript-eslint/ban-ts-comment`。这是"护栏自己把自己炸掉"的典型。

四处都要加：

```js
// eslint.config.js
{ ignores: [".stryker-tmp/**", "reports/**"] }
```

```json
// knip.json
{ "ignore": [".stryker-tmp/**", "reports/**"] }
```

```json
// .jscpd.json
{ "ignore": ["**/.stryker-tmp/**"] }
```

```gitignore
.stryker-tmp/
reports/
```

`reports/` 是 `incrementalFile` 的默认落点，同样不该入库。

## 成本

作者项目约 **4,700 mutants**，增量运行约 **6 分钟**。

所以默认限定 `mutate` 范围，只在需要时全量跑。

## 常用命令

```bash
npx stryker run            # 全量
npx stryker run --dryRunOnly   # 只跑初始测试，验证配置
```

## 验证

```bash
npx stryker run --dryRunOnly
```

确认：配置被解析（`testRunner: "vitest"` 生效、不是回落到 `command`）、测试能跑通、没有报"找不到 mutation 文件"。

不要用全量 run 做验证——几分钟起步，且首次接入时分数不重要。

## 存活变异体怎么读

四类信号与判读方式 → `../detect.md`。简述：断言只查 shape 不查 content、未经验证输出生成的 snapshot、断言复述实现、检查 mock 而不是代码。

## 出处

要点 7 的推荐工具。配置键、默认值、阈值语义取自官方 schema 与源码实跑。
