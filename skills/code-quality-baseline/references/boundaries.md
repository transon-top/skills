# 架构边界

AI 不记得你的架构，会把应用"往 GitHub 平均值拽"——one reasonable-looking import at a time。每一次 import 单独看都合理，累积起来架构就没了。

## 先定层，再装工具

**层必须来自用户。** 目录名和允许的依赖方向由项目决定，代人臆造的层不成立。流程：

1. 按项目技术栈查 Context7，找框架官方文档里的目录约定
2. 查得到就用它作为提议；查不到用下面的兜底表
3. `AskUserQuestion` 请用户确认或修改，**拿到具体目录名与方向**之后才动手

### 跨栈兜底表

| 栈 | 层目录 | 方向 |
| --- | ------ | ---- |
| React SPA（Vite） | `components/` `pages/` `hooks/` `services/` `stores/` `lib/` `types/` | service / store / lib / type **不得** import component / page / hook |
| Next.js App Router | `app/` `components/` `hooks/` `lib/` `types/` | `app/` → 其余；`lib/` 不得 import `components/` |
| TanStack Start | `routes/` `features/` `components/` `lib/` | `routes/` → `features/` → `lib/` 单向 |
| Vue（Vite） | `views/` `components/` `composables/` `stores/` `services/` | 同 React SPA 方向 |
| 通用 | — | 工具 / 类型 / 配置层不含领域逻辑；mock 不进生产构建；router 只做路由映射 |

**报错文案与规则本身同等重要**：必须告诉开发者 / agent"应该放到哪里"，而不只是"哪里错了"。只说"哪里错了"的报错，半年后会被 `eslint-disable` 掉。

```text
x boundaries(dependencies): Business layers stay UI-free: a service, store, lib
  or type file must not import components, pages or hooks. A type shared with
  a form belongs in src/types or next to the service.
```

## 安装

```bash
<install> eslint-plugin-boundaries
<install> --save-exact eslint-import-resolver-typescript@4.4.5
```

**resolver 必须 pin 精确版本**（`--save-exact`，不用 `^`）。boundaries 通过 `eslint-module-utils` 的 legacy 接口（`interfaceVersion: 2`）加载 resolver；新版若砍掉这个顶层导出，失败方式是**静默失效**——lint 全绿，架构约束形同虚设。pin 住版本让这类变化在升级时显式暴露。

**解除判据**：要升 resolver 主版本时，先跑哨兵规则。它报错 = 接口还在，可以升；它静默 = 接口没了，别升。

v3（3.10.1）与 v4（4.4.5）配置写法零差异，回退成本为零。

## 四个坑

### 坑 A：`pattern` 匹配的是「文件夹」，不是层目录本身

folder 模式下 `pattern: "services/*"` 要求元素是 `services/` 的**子文件夹**。如果层就是 `src/services/api.ts` 这种文件直接躺在目录里的结构，pattern 要写成 `"services"`（不带 `/*`）。

实测匹配矩阵（`src/services/api.ts` 里 import `src/components/Button`）：

| pattern | 结果 |
| ------- | ---- |
| `components` | 命中 |
| `components/**` | 命中 |
| `**/components` | 命中 |
| `components/*` | **不命中** |
| `src/components/*` | **不命中** |

pattern 末段带扩展名时插件会 warn（"Element patterns match folders, not individual files"），注意读它。

### 坑 B：TS 无扩展名导入必须配 resolver，否则静默失效

boundaries 内置的解析器是 `eslint-import-resolver-node`，**解析不了 `../components/Button` → `Button.tsx`**。表现是元素被判为 `isUnknown: true`，规则一条不报、也不提示。

```js
settings: {
  "import/resolver": { typescript: true },
}
```

排查用 `boundaries/debug`——它会打印 `"isUnknown": true`。

### 坑 C：必须加哨兵规则

前两个坑的表现都是**静默 exit 0**：lint 全绿，规则一条没跑。这是最坏的一类失败——有护栏的假象，没有护栏的实质。

```js
rules: { "boundaries/no-unknown-dependencies": "error" }
```

resolver 失效时它立刻报 `Dependencies to unknown elements and files are not allowed`；正常时不误报。**不要省这一条**——它是唯一能自动发现假绿的机制。

**但哨兵也需要喂饱 `boundaries/elements`。** 任何本地目录只要有 import 进出、却不在 elements 列表里，哨兵就会对它报 unknown（实测：加了 `@/client` 生成目录的导入后立刻报两条 error）。所以 elements 要覆盖**所有参与依赖的本地目录**，**生成目录也一样**——排除出 lint 和排除出边界检查是两回事。

哨兵报警时先看是不是 elements 漏了目录，再怀疑 resolver。

### 坑 D：不要用 `import-x/resolver-next`

```js
settings: { "import-x/resolver-next": [createTypeScriptImportResolver()] }   // ← 对 boundaries 无效
```

**boundaries 完全不认这个 key，且同样静默 exit 0**——它走 `settings["import/resolver"]` 单一入口，不识别 `import-x/resolver-next` 或 `import/resolver-next`。`{ typescript: createTypeScriptImportResolver() }` 这种写法侥幸能跑但不是因为它对：按包名加载的是模块本身，工厂返回值被当作 options 忽略。

## 完整示例

```js
import boundaries from "eslint-plugin-boundaries";

export default [
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: true },
      "boundaries/elements": [
        { type: "component", pattern: "components" },
        { type: "page", pattern: "pages" },
        { type: "service", pattern: "services" },
        { type: "lib", pattern: "lib" },
        { type: "type", pattern: "types" },
        { type: "hook", pattern: "hooks" },
        { type: "store", pattern: "stores" },
      ],
    },
    rules: {
      "boundaries/no-unknown-dependencies": "error",   // 哨兵
      "boundaries/dependencies": [
        "warn",
        {
          default: "allow",
          policies: [
            {
              from: { element: { type: ["service", "store", "lib", "type"] } },
              disallow: { to: { element: { type: ["component", "page", "hook"] } } },
            },
          ],
        },
      ],
    },
  },
];
```

TS 文件需要 parser：项目若已用 `typescript-eslint` 的 `recommended`，parser 已全局设好；否则在配置块里补 `languageOptions: { parser: tsParser }`（来自 `@typescript-eslint/parser`）。

v7 的三个变更：规则名是 `boundaries/dependencies`（`boundaries/element-types` 是 v6 的重命名，v7 保留为会 warn 的废弃别名）；`rules:` 选项改名为 `policies:`；**v7 的 `configs.recommended` 里没有 `plugins` 键**，引用它必须自己补 `plugins: { boundaries }`。

`from` 可以省略（省略即"任意来源"）。要 allowlist 风格就把 `default` 改成 `"disallow"` 并逐条 `allow`。

## oxlint

**oxlint 没有原生 boundaries 规则**。项目已用 oxlint 时，报告这个现状：要么引入 ESLint 专做边界检查，要么接受 oxlint 的 `jsPlugins`（alpha）方案，把 `eslint-plugin-boundaries` 挂上去跑。

## 验证

```bash
<exec> eslint <一个违反了层规则的既有文件>
```

- **确认哨兵规则在配置里**——这是唯一能自动发现的假绿
- 跑 `boundaries/debug` 确认元素被识别（不是 `isUnknown: true`）
- **故意造一条非法依赖验证一次**，确认规则真的会报
