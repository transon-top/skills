# ESLint 基建与规则插件

## 先探测版本，再选写法

**项目的 ESLint 版本决定写法，不由本技能决定。** 生态里大量插件仍以 ESLint 9 为适配基线，强推版本会连带撞上一堆 peer 冲突。

探测：`package.json` 的 `eslint` 字段、lockfile、`pnpm exec eslint --version`。

### 基线写法：纯数组

```js
// 这在 ESLint 8.56 / 9.x / 10.x 上全部可用
export default [
  // ...
];
```

**纯数组 `export default [...]` 是唯一跨 8.56 / 9 / 10 全通的写法**（实测三版本全过，无需任何环境变量）。**本技能一律用它**，不引入 `defineConfig`。

`defineConfig`（来自 `eslint/config`）**在 ESLint 9.22.0 才出现**，8.57 与 9.21 及以下没有这个 subpath（`ERR_PACKAGE_PATH_NOT_EXPORTED`）。项目已经在用就用，但不要为了它引入。

### 版本差异清单

| 项目 | ESLint 9 | ESLint 10 |
| ---- | -------- | --------- |
| `eslint/config` 的 `defineConfig` | 9.22.0+ 才有 | 有 |
| `includeIgnoreFile` | **任何 9.x 都没有**，用 `@eslint/compat` | 10.4.0+ 才有 |
| `ESLINT_USE_FLAT_CONFIG=false` | 有效，legacy config 可跑（带弃用警告） | **完全失效**，legacy 已移除 |
| `@eslint/js` 配对 | `9.x` 无 peer，宽松 | `10.x` 硬要求 `eslint@^10`，装错主版本时**安装期**就报错 |
| `.ts` 配置文件 | 9.18.0+ 默认启用（9.12–9.17 需 `--flag unstable_ts_config`） | 默认可用 |
| `eslint-plugin-jsx-a11y` 安装 | **干净**，无需额外参数 | peer 上限停在 `^9`，pnpm 只警告；npm 需放宽 |

**插件的 preset 名在 9 与 10 下逐字节相同**，没有任何一个包在 v9 下需要走不同 preset。

### 默认是 flat config

ESLint 9 起 flat config 是默认。项目里有 `.eslintrc.*` 但没有 `eslint.config.*` 时，ESLint 9 会直接报错找不到配置文件——legacy 需要显式 `ESLINT_USE_FLAT_CONFIG=false`。

**迁移 legacy 到 flat 不在本技能职责内**，报告给用户决定。本技能涉及的插件基本都保留 legacy preset（`sonarjs.configs['recommended-legacy']`、`vitest.configs['legacy-recommended']`、`playwright.configs.recommended`、`reactYouMightNotNeedAnEffect.configs['legacy-recommended']`、jsx-a11y 的 `configs.recommended`）。

---

## 安装

```bash
pnpm add -D \
  @eslint/js globals \
  typescript-eslint \
  eslint-plugin-sonarjs \
  eslint-plugin-react-you-might-not-need-an-effect \
  @vitest/eslint-plugin \
  eslint-plugin-playwright \
  eslint-plugin-boundaries \
  eslint-import-resolver-typescript
```

**只装用户勾选的插件。** 上面是全量。

**`eslint` 本身只在该项目还没有时才装**，且 `@eslint/js` 的主版本必须与项目 ESLint 主版本一致（`@eslint/js@9.x` ↔ `eslint@9`，`10.x` ↔ `eslint@10`）。

**这条必须显式 pin，不能靠包管理器默认。** 实测：项目用 `eslint@9.39`，直接 `pnpm add -D @eslint/js` 会装成**最新主版本**，与项目的 eslint 主版本不一致——pnpm 只在末尾打一行 `[WARN] Issues with peer dependencies found`，不报错（npm 会直接 ERESOLVE 失败）。这种"装上了但配错"的状态没有任何即时反馈。装完必须核对主版本。

**`eslint-plugin-jsx-a11y` 单独处理**：它的 peer 上限停在 `^9`，而包本身已久未发版，**运行时正常**（实测 `jsx-a11y/alt-text`、`jsx-a11y/click-events-have-key-events` 等正常报出）。

```bash
pnpm add -D eslint-plugin-jsx-a11y
```

pnpm 的 `strictPeerDependencies` 默认关闭，peer 越界只警告不失败，所以这条命令在 ESLint 9 与 10 下都直接可用。npm 项目需要 `--legacy-peer-deps` 放宽校验，或在 `package.json` 里加 `overrides`。

---

## 各插件的配置

**preset 名与版本无关，9 和 10 下相同。**

### sonarjs

```js
import sonarjs from "eslint-plugin-sonarjs";

export default [
  sonarjs.configs.recommended,
];
```

只有 `configs.recommended` 与 `configs["recommended-legacy"]`。**没有 `strict`，没有 `flat/` 前缀。**

`recommended` 的语义是"推荐的规则设 `error`，其余显式 `off`"。自带 `plugins`，**不含 `files`**，作用于所有文件。

只开部分规则：

```js
{ plugins: { sonarjs }, rules: { "sonarjs/no-implicit-dependencies": "error" } }
```

### react-you-might-not-need-an-effect

```js
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";

export default [
  reactYouMightNotNeedAnEffect.configs.recommended, // 全部 warn
  // reactYouMightNotNeedAnEffect.configs.strict,   // 全部 error
];
```

两者**规则集相同，只差级别**。都自带 `files`、`plugins`、`languageOptions`（browser globals + jsx），可裸放。

### @vitest/eslint-plugin

```js
import vitest from "@vitest/eslint-plugin";

export default [
  {
    files: ["tests/**"],
    ...vitest.configs.recommended,
    languageOptions: { globals: { ...vitest.environments.env.globals } },
  },
];
```

preset 只有 `recommended` / `all` / `env` / `legacy-recommended` / `legacy-all`。**没有 `flat/recommended`**。`recommended` **不含 `files`**，要自己加。

规则 `vitest/expect-expect` 与 `vitest/no-focused-tests` 在 `recommended` 里都是 `error`。

- `expect-expect` 选项：`{ assertFunctionNames: string[], additionalTestBlockFunctions: string[] }`
- `no-focused-tests` 选项：`{ fixable: boolean }`，**默认 `true`（自动删掉 `.only`）**

> 官方 `docs/rules/no-focused-tests.md` 里的 `vitest.configs.recommended.all` 是笔误，正确是 `vitest.configs.all`。

### eslint-plugin-playwright

```js
import playwright from "eslint-plugin-playwright";

export default [
  {
    files: ["e2e/**"],
    ...playwright.configs["flat/recommended"],
  },
];
```

**flat config 下必须用 `flat/recommended`。`playwright.configs.recommended` 是 legacy（eslintrc）版**——`plugins` 是字符串数组，flat 下直接用会失效。这是最容易踩的一个坑。

用 `files` 包一层限定到测试目录，是官方推荐做法。

### jsx-a11y

```js
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    ...jsxA11y.flatConfigs.recommended,
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      globals: { ...globals.browser },
    },
  },
];
```

`flatConfigs.recommended` / `flatConfigs.strict` 与 legacy `configs.*` 的差异只有 `plugins` 形态与多一个 `name` 字段，**规则集相同**。

README 明确提示这两个 config **不配置 `files` 和 `languageOptions.globals`**，要自己补。

`jsx-a11y` 只能逐文件工作，跨组件的无障碍漂移（按钮在 A 组件有 label、在 B 组件没有）它看不见。

### typescript-eslint

`tseslint.config()` 在 ESLint 9 与 10 下都正常工作，**废弃只是 JSDoc 层面的提示**（不会运行时报错或告警），可以继续用。

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended, // ← 是数组，必须展开
];
```

`tseslint.configs.base` / `eslintRecommended` / `disableTypeChecked` 才是单个对象。

**peer 范围**：它在 `peerDependencies` 里声明了 `eslint` 与 `typescript` 的范围，**TS 有上限**。项目 TS 主版本偏新时先核对：`pnpm view typescript-eslint peerDependencies`。完整症状与处置 → `../version-compat.md`。

### 四条 TypeScript 规则

| 规则 | 在哪个 preset | 说明 |
| ---- | ------------- | ---- |
| `@typescript-eslint/no-explicit-any` | `recommended` + `strict` | |
| `@typescript-eslint/no-non-null-assertion` | 仅 `strict` | 需手动开 |
| `@typescript-eslint/explicit-function-return-type` | **仅 `all`** | 需手动开 |
| `@typescript-eslint/consistent-type-definitions` | `stylistic` | 需手动开 |

四条都未废弃。`@typescript-eslint/no-var-requires` 已废弃（8.0.0 起），替代品是 `no-require-imports`。

```js
{
  files: ["**/*.{ts,tsx}"],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
  },
}
```

**"import 只走别名"没有官方规则。** 替代写法用 `@typescript-eslint/no-restricted-imports` 的 `patterns`：

```js
{
  "@typescript-eslint/no-restricted-imports": ["warn", {
    patterns: [
      { group: ["../*", ".."], message: "请使用别名导入，不要用相对父级路径" },
    ],
  }],
}
```

另一条路是 `eslint-plugin-import` 的 `import/no-relative-parent-imports`（未核实其 flat config 写法）。

---

## 两个实测的噪声规则

`sonarjs.configs.recommended` 里有两条在普通项目上只产生噪声，建议首次接入即关掉，并在规范里注明原因：

```js
{
  ...asWarn(sonarjs.configs.recommended),
  rules: {
    ...asWarn(sonarjs.configs.recommended).rules,
    // 要求每个文件带版权头——大多数项目不写
    "sonarjs/file-header": "off",
    // 认不出 Vite 的 peer 依赖与 tsconfig paths 别名，对 react / vitest / @/xxx 全部误报
    "sonarjs/no-implicit-dependencies": "off",
  },
}
```

第二条尤其要注意：只要项目用路径别名（`@/`），它就会对**每一个别名 import** 报 `Either remove this import or add it as a dependency`。留着它会让真正的依赖问题淹没在噪声里。

## 基线降级：新规则一律 `warn`

**`asWarn` 要套在每一个 preset 上，包括 `jsxA11y.flatConfigs.recommended`。** 漏套的后果是那个 preset 的规则以 `error` 进入，在既有仓库上立刻阻塞——这正是基线策略要避免的。首次生成配置后，跑一次 `eslint .` 确认输出里没有 `error` 级条目。

按 SKILL.md 的基线策略，**首次接入时把 preset 的级别整体降为 `warn`**，避免既有仓库首跑吐出数百条 `error` 让整个努力被放弃。

```js
// 把任意 preset 的全部规则降为 warn，保留原有选项
const asWarn = (config) => ({
  ...config,
  rules: Object.fromEntries(
    Object.entries(config.rules ?? {}).map(([rule, value]) => {
      // `off` 必须原样保留：preset 里 `off` 的语义是「这条规则在本 preset 下
      // 刻意不启用」。统一降级为 `warn` 等于反向开启它明确关掉的规则。
      if (value === "off" || value === 0) return [rule, "off"];
      return [rule, Array.isArray(value) ? ["warn", ...value.slice(1)] : "warn"];
    })
  ),
});

export default [
  asWarn(sonarjs.configs.recommended),
  asWarn(reactYouMightNotNeedAnEffect.configs.recommended),
];
```

**`off` 那一支不能省。** 多数 preset 的写法是"推荐的规则设 `error`，其余显式 `off`"，`off` 条目占了很大一部分。漏掉这一支等于反向开启 preset 判定"不该默认开"的规则，在一个干净仓库上会立刻多出一批与本项目无关的告警。

等某条规则真的抓到 bug，再单独升回 `error`；一个月只产生噪声的规则关掉。

---

## 拼装示例

按用户勾选裁剪。以下形态**在 ESLint 9 与 10 上都实跑通过**：

```js
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
import vitest from "@vitest/eslint-plugin";
import playwright from "eslint-plugin-playwright";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    ...jsxA11y.flatConfigs.recommended,
    languageOptions: { globals: { ...globals.browser } },
  },

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
    },
  },

  asWarn(sonarjs.configs.recommended),
  asWarn(reactYouMightNotNeedAnEffect.configs.recommended),

  {
    files: ["tests/**"],
    ...vitest.configs.recommended,
    languageOptions: { globals: { ...vitest.environments.env.globals } },
  },

  {
    files: ["e2e/**"],
    ...playwright.configs["flat/recommended"],
  },
];
```

生成时**不要照抄**——按勾选裁剪、按项目实际目录结构改 `files`、React 相关项只在 React 项目里出现。

## 验证

```bash
pnpm exec eslint <一个既有源文件>
```

**必须看到工具真的在跑、规则真的在报。** 四个假绿点：

- 输出为空且没有跳过提示 → 可能 `files` 没匹配上
- 只跑单文件，不跑全量（全量只报告计数）
- 确认 `pnpm exec eslint --version` 与项目 `package.json` 一致
- `pnpm exec eslint --print-config <file>` 确认某文件实际生效的配置，排查 `files` 不匹配最有用

## 出处

要点 3 的推荐规则集。preset 名与版本无关。

实测自 `eslint@9.39.5` 与 `eslint@10.10.0` 双版本对照、`typescript-eslint@8.70.0`、`eslint-plugin-jsx-a11y@6.10.2`（2026-09，夹具实跑）。
