# 架构边界

两个工具做两件不同的事，不要当成二选一：

| 工具 | 层面 | 查什么 |
| ---- | ---- | ------ |
| `eslint-plugin-boundaries` | import 语句 | 层与层之间的依赖方向，编辑器里就能看到 |
| `dependency-cruiser` | 全局依赖图 | 循环依赖、孤儿模块、无法解析的依赖、废弃依赖 |

重叠部分（层规则）**优先用 boundaries**——它逐文件报错、编辑器内即时反馈。`dependency-cruiser` 用它盖不住的部分。

---

## eslint-plugin-boundaries

### 安装

```bash
pnpm add -D eslint eslint-plugin-boundaries
pnpm add -D --save-exact eslint-import-resolver-typescript@4.4.5   # TypeScript 项目必需
```

**resolver 要 pin 精确版本（`--save-exact`）**，不要用 `^`。boundaries 是通过 `eslint-module-utils` 的 **legacy 接口**（`interfaceVersion: 2`）加载 resolver 的；新版若砍掉这个顶层导出，失败方式是**静默失效**——lint 全绿，架构约束形同虚设。pin 住版本让这类变化在升级时显式暴露。

**解除判据**：要升 resolver 主版本时，先跑一次哨兵规则 `boundaries/no-unknown-dependencies`。它报错 = resolver 接口还在，可以升；它静默 = 接口没了，别升。

v3（3.10.1）与 v4（4.4.5）**配置写法零差异**，都在 `settings` 里用 `import/resolver`。回退成本为零。

TS 文件需要 parser：项目若已用 `typescript-eslint` 的 `recommended`，parser 已全局设好；否则在配置块里补 `languageOptions: { parser: tsParser }`（来自 `@typescript-eslint/parser`）。

### v7 的三个重大变更

1. **规则名是 `boundaries/dependencies`**。`boundaries/element-types` 在 v6 重命名，v7 保留为**会 warn 的废弃别名**
2. **`rules:` 选项改名为 `policies:`**（v6 起），老写法触发 deprecation warning
3. **v7 导出的 `configs.recommended` 里没有 `plugins` 键**（源码里还留着 TODO），引用它必须自己补 `plugins: { boundaries }`

### 两个会让人白忙半天的坑

**坑 A：`pattern` 匹配的是「文件夹」，不是层目录本身。**

folder 模式下 `pattern: "services/*"` 要求元素是 `services/` 的**子文件夹**（即 `src/services/foo/index.ts`）。如果层就是 `src/services/api.ts` 这种文件直接躺在目录里的结构，pattern 要写成 `"services"`（不带 `/*`）。

实测匹配矩阵（`src/services/api.ts` 里 import `src/components/Button`）：

| pattern | 结果 |
| ------- | ---- |
| `components` | 命中 |
| `components/**` | 命中 |
| `**/components` | 命中 |
| `components/*` | **不命中** |
| `src/components/*` | **不命中** |

**坑 B：TS 无扩展名导入必须配 `import/resolver`，否则静默失效。**

boundaries 内置的解析器是 `eslint-import-resolver-node`，**解析不了 `../components/Button` → `Button.tsx`**。表现是元素被判为 `isUnknown: true`，规则一条不报、也不提示。

必须加：

```js
settings: {
  "import/resolver": { typescript: true },
}
```

**排查用 `boundaries/debug`**——它会打印 `"isUnknown": true`。

### 坑 C：必须加哨兵规则

前两个坑的表现都是**静默 exit 0**：lint 全绿，规则一条没跑，看起来一切正常。这是最坏的一类失败——有护栏的假象，没有护栏的实质。

加一条哨兵规则把静默变成响亮：

```js
rules: {
  "boundaries/no-unknown-dependencies": "error",
}
```

resolver 失效时它立刻报 `Dependencies to unknown elements and files are not allowed`；resolver 正常时不误报。**这是把"静默失效"变成"响亮失败"的唯一低成本手段，不要省。**

**但哨兵也需要喂饱 `boundaries/elements`。** 任何本地目录只要有 import 进出、却不在 elements 列表里，哨兵就会对它报 unknown。实测：加了 `@/client`（OpenAPI 生成目录）的导入后立刻报两条 error。

所以 `boundaries/elements` 要覆盖**所有参与依赖的本地目录**，生成目录也一样：

```js
"boundaries/elements": [
  { type: "client", pattern: "src/client" },   // 生成目录也要声明
  { type: "component", pattern: "src/components" },
  // ...
]
```

哨兵报警时先看是不是 elements 漏了目录，再怀疑 resolver。

### 坑 D：不要用 `import-x/resolver-next`

v4 主推的现代写法：

```js
settings: {
  "import-x/resolver-next": [createTypeScriptImportResolver()],   // ← 对 boundaries 无效
}
```

**boundaries 完全不认这个 key，且同样静默 exit 0。** 原因：boundaries 走 `eslint-module-utils` 的 `settings["import/resolver"]` 单一入口，它不识别 `import-x/resolver-next` 或 `import/resolver-next`。

`{ typescript: createTypeScriptImportResolver() }` 这种写法**侥幸能跑但不是因为它对**——`eslint-module-utils` 按包名加载的是模块本身，工厂返回值只是被当作 options 忽略，真正执行的是模块顶层的 legacy `resolve`。别用。

### 完整示例

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
      // 哨兵：resolver 失效时立刻报错，而不是静默全绿
      "boundaries/no-unknown-dependencies": "error",
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

报错原文形态：

```text
src/services/api.ts  1:24  warning  Dependencies to elements of type "component" are not allowed in elements of type "service". Denied by policy at index 0
```

`from` 可以省略（省略即"任意来源"）。要 allowlist 风格就把 `default` 改成 `"disallow"` 并逐条 `allow`。

其他 policy 选项（类型定义中有，未逐一实跑）：`checkInternals`、`checkUnknownLocals`、`checkAllOrigins`。

> 该包将更名为 `@boundaries/eslint-plugin`（源码里有被注释的警告）。当前安装名仍是 `eslint-plugin-boundaries`。

**分层结构必须来自用户**——问清楚目录名和允许的依赖方向，不代人臆造。

---

## dependency-cruiser

### 安装与初始化

```bash
pnpm add -D dependency-cruiser
pnpm exec depcruise --init oneshot
```

`depcruise` / `dependency-cruiser` / `dependency-cruise` 是**同一程序的三个别名**（wrapper 逐字节相同）。统一用 `depcruise`。

`--init oneshot` 写出的是 **`.dependency-cruiser.cjs`**（CommonJS 导出；`export default` 形态要自己改成 `.js`）。v13 起自动发现配置，无需 `--config`。

### 版本兼容坑（必须先看）

**它不在 `package.json` 里声明 `typescript`**，所以包管理器拦不住 TS 主版本偏新的组合。后果是**静默返回 `0 modules, 0 dependencies cruised`**——不报错，只是什么都没检查。

**先跑一次确认模块数非 0**，是 0 就别接这个工具，并在报告中说明原因。不要接上一个永远报 0 的检查。完整症状与处置 → `../version-compat.md`。

### 配置

```js
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "ui-no-data-layer",
      comment:
        "UI 层不得直接依赖 data 层。请通过 features 层的 use-case 间接访问：" +
        "先在 features/<name>/api.ts 暴露查询函数，再由 UI 调用。" +
        "理由：保证 data 层可替换（换 REST/GraphQL 不影响 UI）。",
      severity: "warn",
      from: { path: "^src/ui/" },
      to: { path: "^src/data/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
```

字段语义：

- `name` —— 出现在 reporter 输出里，便于快速定位是哪条规则
- `comment` —— **不参与规则逻辑**，纯粹是给读报错的人看的
- `severity` —— `info` / `warn` / `error` / `ignore`，**缺省 `warn`**。`error` 会让部分 reporter 返回非零退出码。设 `ignore` 则完全跳过该规则

### `comment` 默认不显示

**必须显式指定 `--output-type err-long`**，默认的 `err` 不打印 comment。

```bash
pnpm exec depcruise --output-type err-long src
```

这不是美观问题——文章的论点是"报错信息要和失败本身同等重要"，而 `comment` 正是"为什么有这条规则 + 怎么修"的载体。官方对 `err-long` 的说明就是"easier to put the rule into context (and if the comment contains that information: why the rule is there, and how to fix it)"。

所以所有命令（含 `package.json` 里的 script）都用 `err-long`。

### 两个实测的配置要点

**`tsPreCompilationDeps` 要开。** 模板默认带 `true`，精简配置时容易被删掉；关掉时**只被 `import type` 引用的模块会被 `no-orphans` 误报**——实测 `src/types/order.ts` 只被类型导入引用，就被列为孤儿。

**层规则的 `to` 指向生成目录时，`from` 也要排除生成目录。** 否则生成物内部文件互相 import 会被判成违规（实测报 `client-only-from-services: src/client/client.gen.ts → …`）。生成目录的规则两个方向都要写 `pathNot`。

### `--include-only` 会漏报

`--include-only "^src"` 过滤的是 **cruise 范围**，不只是报告范围。用它限定 `src` 会让跨目录违规**根本不在被检查的模块集合里**，于是不报。

```bash
pnpm exec depcruise --output-type err-long src      # ← 用位置参数，别用 --include-only
```

### `--init` 模板自带规则

`no-circular`（循环依赖）、`no-orphans`（孤儿模块）、`no-deprecated-core`、`not-to-deprecated`、`no-non-package-json`（error）、`not-to-unresolvable`（error）、`no-duplicate-dep-types`、`not-to-test` / `not-to-spec`。

保留模板里的规则（改成 `warn`），在其上追加项目自己的层规则。

### 退出码

等于 **error 级别违规的数量**。

---

## oxlint

文章提到了 oxlint 的 `boundaries`。**核实结论：oxlint 没有原生 boundaries 规则**（规则目录只有 eslint / import / jest / jsdoc / jsx_a11y / nextjs / node / oxc / promise / react / react_perf / typescript / unicorn / vitest / vue）。

架构边界在 oxlint 里只能走 `jsPlugins` 层（alpha），把 `eslint-plugin-boundaries` 挂上去跑，且需要配 `import/resolver`。

**不要**因为文章提到就承诺"oxlint 能查边界"。项目已用 oxlint 时：报告这个现状，让用户决定是引入 ESLint 专做边界检查，还是接受 oxlint 的 jsPlugins alpha 方案。

---

## 验证

```bash
pnpm exec eslint <一个违反了层规则的既有文件>
pnpm exec depcruise --output-type err-long <src 目录>
```

四个假绿点：

- **确认哨兵规则 `boundaries/no-unknown-dependencies` 在配置里**——这是唯一能自动发现的假绿
- **boundaries 静默失效**最常见——跑 `boundaries/debug` 确认元素被识别（不是 `isUnknown: true`）
- **`pattern` 写错同样静默**——`pattern: "src/services/*"` 匹配不到直接躺在 `src/services/api.ts` 的文件，规则连评估都不进入。pattern 末段带扩展名时插件会 warn（"Element patterns match folders, not individual files"），注意读它
- **dc 报 0 modules** 通常是 TS 版本不兼容 → `../version-compat.md`

**故意造一条非法依赖验证一次**，确认规则真的会报。只验证"没报错"证明不了任何事。

## 出处

要点 4 的推荐工具。配置细节取自发布包源码。

实测自 `eslint-plugin-boundaries@7.2.0`、`eslint-import-resolver-typescript@4.4.5`、`dependency-cruiser@18.2.0`、`oxlint@1.82.0`（2026-09，夹具实跑）。
