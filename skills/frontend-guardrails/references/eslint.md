# ESLint 装配

## 项目的 ESLint 版本决定写法

探测：`package.json` 的 `eslint` 字段、lockfile、`pnpm exec eslint --version`。

**多段配置就用纯数组 `export default [...]`**——它是唯一在 ESLint 8.56 / 9 / 10 上全通的写法，不引入 `defineConfig`。ESLint 9 起 flat config 是默认——项目里有 `.eslintrc.*` 但没有 `eslint.config.*` 时直接报错找不到配置文件，ESLint 10 完全移除了 legacy。**迁移 legacy 到 flat 不在本技能职责内**，报告给用户决定。

主版本差异与 pnpm 陷阱 → `version-compat.md`。

## 安装

```bash
pnpm add -D \
  @eslint/js globals typescript-eslint \
  eslint-plugin-sonarjs \
  eslint-plugin-react-you-might-not-need-an-effect \
  eslint-plugin-react-doctor \
  @vitest/eslint-plugin \
  eslint-plugin-playwright \
  eslint-plugin-boundaries \
  eslint-import-resolver-typescript
```

**只装勾选的插件**；`eslint` 本身只在项目还没有时才装。boundaries 需要 `eslint-import-resolver-typescript`，且**必须 `--save-exact` pin 精确版本**（理由见 `boundaries.md`）。

**`@eslint/js` 的主版本必须与项目 ESLint 主版本一致，且要显式 pin**——装错主版本不报错，只打一行 WARN。症状与原因 → `version-compat.md`。

## 各插件的 config 形态

**preset 名与版本无关，ESLint 9 与 10 下逐字节相同。**

### react-doctor（仅 React 项目）

它**完全不声明 `peerDependencies`**（连 key 都没有）——装不冲突，也没有保护。`configs` 有 7 个 key：`recommended`、`next`、`react-native`、`tanstack-start`、`tanstack-query`、`preact`、`all`。`recommended` 启用 566 条（380 warn / 186 error），插件共导出 906 条。

**它的任何 config 都没有 `files`、没有 `languageOptions`。** 裸放的结果是：

```text
0:0  warning  File ignored because no matching configuration was supplied
```

flat config 默认只匹配 `**/*.{js,mjs,cjs}`，`.jsx` / `.tsx` 全部落空。必须自己包一层：

```js
import reactDoctor from "eslint-plugin-react-doctor";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
  },
  reactDoctor.configs.recommended,
];
```

TS 项目**必须**有 `typescript-eslint` 提供 parser，否则 `Parsing error: Unexpected token <`。`files` 里留着 `.ts` 无害但无收益——规则几乎全是 JSX 触发点，普通 `.ts` 上一条都报不出。

框架 config（`next` 23 条、`react-native` 32 条、`tanstack-start` 14 条、`tanstack-query` 9 条）按第 3 步的确认结果追加，放在 `recommended` 之后。

**规则级覆盖只接受裸字符串**，不支持 options：

```js
{ rules: { "react-doctor/alt-text": "off" } }   // ✓
{ rules: { "react-doctor/jsx-key": ["warn", {...}] } }   // ✗ 报错：所有规则 schema 为 []
```

规则名打错会让 ESLint 直接崩（exit 2），不会静默——这点是好的。

**`settings["react-doctor"].portedRuleMode` 默认 `"curated"`**，但它当前**只对两条规则降噪**：`alt-text` 对 `opengraph-image.*` / `icon.*` / `twitter-image.*` / `apple-icon.*` 整个文件跳过；`aria-role` 对自定义组件跳过（`ignoreNonDOM`）。`anchor-has-content` 在 `page.*` / `layout.*` 下**照报**——别指望路由级抑制。覆盖成 `"raw"` 才会全报。**保持默认**，排查"某条 a11y 规则为什么不报"时先看这里。

### sonarjs

```js
import sonarjs from "eslint-plugin-sonarjs";
export default [sonarjs.configs.recommended];
```

只有 `configs.recommended` 与 `configs["recommended-legacy"]`，**没有 `strict`，没有 `flat/` 前缀**。自带 `plugins`，不含 `files`，作用于所有文件。

`file-header`（版权头）与 `no-implicit-dependencies`（认不出 Vite peer 依赖与 tsconfig paths 别名）在 `recommended` 里**已是 `off`**，不用手动关；要打开就预期噪声——后者会对**每一个别名 import** 报 `Either remove this import or add it as a dependency`，让真正的依赖问题淹没在噪声里。

### react-you-might-not-need-an-effect

```js
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
export default [reactYouMightNotNeedAnEffect.configs.recommended];
```

`recommended` 与 `strict` **规则集相同，只差级别**（另有 `legacy-recommended` / `legacy-strict`）。都自带 `files`、`plugins`、`languageOptions`，可裸放。

### @vitest/eslint-plugin

```js
import vitest from "@vitest/eslint-plugin";

export default [
  {
    files: ["tests/**"],                                  // ← 自己加，recommended 不含 files
    ...vitest.configs.recommended,
    languageOptions: { globals: { ...vitest.environments.env.globals } },
  },
];
```

preset 只有 `recommended` / `all` / `env` / `legacy-recommended` / `legacy-all`，**没有 `flat/recommended`**。

`vitest/expect-expect`（测试无断言）与 `vitest/no-focused-tests`（忘删的 `.only`）在 `recommended` 里都是 `error`。`no-focused-tests` 默认 `fixable: true`，**会自动删掉 `.only`**。

**不要用 `eslint-plugin-vitest`**——那是社区旧包（最后发布 2024-04，peer 范围不含 ESLint 10），仓库已 transfer 给 vitest 官方并从 `@vitest/eslint-plugin` 继续发版。**它在 npm 上没有被标记 deprecated**，`npm outdated` 和 renovate 都不会提示。

### eslint-plugin-playwright

```js
import playwright from "eslint-plugin-playwright";

export default [
  { files: ["e2e/**"], ...playwright.configs["flat/recommended"] },
];
```

**flat config 下必须用 `flat/recommended`。`configs.recommended` 是 legacy 版**（带 `env` 键、`plugins` 是字符串数组）——flat 下**启动即报错**，错误信息直指修法，不是静默失效。这是最容易踩的一个坑。

### boundaries

配置细节 → `boundaries.md`。

## TypeScript 规则

`tseslint.configs.recommended` 是**数组**，必须展开（`base` / `eslintRecommended` / `disableTypeChecked` 才是单个对象）。

四条值得手动开的规则：

| 规则 | 在哪个 preset | 为什么开 |
| ---- | ------------- | -------- |
| `@typescript-eslint/no-explicit-any` | `recommended` + `strict` | |
| `@typescript-eslint/no-non-null-assertion` | 仅 `strict` | 它禁止的是"命令 TS 在某个点忽略 null"——AI 爱用它消掉类型错误，等于在错误处贴创可贴 |
| `@typescript-eslint/explicit-function-return-type` | 仅 `all` | |
| `@typescript-eslint/consistent-type-definitions` | `stylistic` | 主要防生成代码在 `interface` 和 `type` 之间来回切换 |

```js
{
  files: ["**/*.{ts,tsx}"],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
    // "import 只走别名"没有官方规则，用它近似
    "@typescript-eslint/no-restricted-imports": ["warn", {
      patterns: [{ group: ["../*", ".."], message: "请使用别名导入，不要用相对父级路径" }],
    }],
  },
}
```

别名与命名这两条的理由不是美观：**死代码检测依赖路径与命名**。文件名与导出名保持一致——命名随机会让 `knip` 的报告失真（它认不出这个文件就是那个模块）。

## 验证

```bash
pnpm exec eslint <一个既有源文件>      # 必须看到规则真的报
pnpm exec eslint .                     # 全量只报告计数
pnpm exec eslint --print-config <file> # 某文件实际生效的配置，排查 files 不匹配最有用
```

四个**假绿**点：

- 输出为空且没有跳过提示 → 可能 `files` 没匹配上
- 只跑单文件，不跑全量（全量只报告计数，不逐条列、不要求修）
- 确认 `pnpm exec eslint --version` 与项目 `package.json` 一致
- **造一个"必须报错"的场景**：只确认"没报错"什么都证明不了
