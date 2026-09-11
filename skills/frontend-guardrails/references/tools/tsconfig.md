# tsconfig 严格选项

对应要点 2。目标是让编译器强制声明"某处可能存在某值"。

## `strict` 展开后是 9 项

```text
noImplicitAny
strictNullChecks
strictFunctionTypes
strictBindCallApply
strictPropertyInitialization
strictBuiltinIteratorReturn   ← TS 5.6 加入，最容易漏
noImplicitThis
useUnknownInCatchVariables
alwaysStrict
```

**`strict` 不是全部。** 以下都**不在** `strict` 里，要单独开：

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `verbatimModuleSyntax`（TS 7 的 `tsc --init` 模板显式写了 `true`，容易被误当成 strict 带的）
- `noImplicitOverride`、`noFallthroughCasesInSwitch`
- `noUnusedLocals`、`noUnusedParameters`、`noImplicitReturns`、`noPropertyAccessFromIndexSignature`、`noUncheckedSideEffectImports`、`isolatedModules`、`moduleDetection`

## 新项目：已经是默认值

**TS 5.9 起 `tsc --init` 生成的模板把 `noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes` 默认写成 `true`。**

所以对新项目，本步骤往往只是"确认已开"，不是"打开"。先读 `tsconfig.json` 再动手。

TS 7 的 `tsc --init` 真实输出片段：

```jsonc
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  }
}
```

---

## `noUncheckedIndexedAccess`

官方一句话定义：*"Add 'undefined' to a type when accessed using an index."*

TS 4.1 release notes 说明了它为什么不进 `strict`：*"not automatically enabled by the `strict` mode flag due to its potential to introduce noise in existing codebases."*

### 类型变化（实测）

| 表达式 | 仅 `strict` | `strict` + 该项 |
| ------ | ----------- | --------------- |
| `arr[0]`（`string[]`） | `string` | **`string \| undefined`** |
| `e[k]`（索引签名） | `string` | **`string \| undefined`** |
| `e.NAME`（已声明属性） | `string` | `string`（**不受影响**） |
| `rec['k']`（`Record<string, number>`） | `number` | **`number \| undefined`** |
| `'a,b'.split(',')[0]` | `string` | **`string \| undefined`** |
| `re[1]`（`RegExpExecArray`） | `string` | **`string \| undefined`** |
| `Object.entries(rec)[0]` | `[string, number]` | **`[string, number] \| undefined`** |
| **元组** `t[0]`（`[string, string]`） | `string` | **`string`（不受影响）** |
| `arr.find()` / `arr.pop()` / `arr.at(0)` | `T \| undefined` | 不变 |
| `map.get('x')` | `T \| undefined` | 不变 |
| `for (const x of arr)` | `string` | 不变 |
| 解构 `const [d0] = arr` | `number` | **`number \| undefined`** |

**元组和 `as const` 数组不受影响**——这是常被传错的一点，也是可行的规避手法。

### 摩擦点

- `'a,b'.split(',')[0]`、`re.exec()[1]`、`Object.entries()[0]` 这类"我确定下标存在"的写法全都要处理
- `for (let i = 0; i < arr.length; i++)` 里的 `arr[i]` 无法被收窄——控制流分析不把 `i < arr.length` 当下标存在的证明

处理方式（优先语义正确的）：

```ts
const first = arr[0] ?? fallback;      // 优先
for (const [i, v] of arr.entries()) {} // 用迭代替代索引
arr[0]!;                               // 非空断言：最轻量，但正是 no-non-null-assertion 要挡的
```

`// @ts-expect-error` 可以压，且错误消失时会反向报错，适合渐进迁移；`// @ts-ignore` 不会，不要用。

---

## `exactOptionalPropertyTypes`

官方定义：*"Interpret optional property types as written, rather than adding 'undefined'."*

默认 `{ a?: string }` 被当作 `{ a?: string | undefined }`，可以显式传 `undefined`；开启后 `a?: string` **就只是 `string`**。

**它要求 `strictNullChecks` 已启用**（`strict: true` 已包含）。

### 差异（实测，`interface Opt { a?: string }`）

| 代码 | 关 | 开 |
| ---- | -- | -- |
| `f({ a: undefined })` | ✅ | ❌ TS2379 |
| `const o: Opt = w`（`w: {a: string \| undefined}`） | ✅ | ❌ TS2375 |
| `o.a = undefined`（含类属性 `this.a = undefined`） | ✅ | ❌ TS2412 |

**90% 的报错来源是第一种**：`prop?: string` 想显式传 `undefined`。

### 标准修法

```ts
interface Props { size?: number | undefined }
```

官方报错信息自己就这么建议：*"Consider adding 'undefined' to the type of the target."*

其他手法：`Required<T>`、显式补偿缺省值 `{ ...props, size: props.size ?? 10 }`、局部 `as`。

### 一条被推翻的流行说法

`{...defaults, ...props}` **不会**必然退化成 `number | undefined`——当 `defaults` 是推断出的字面量类型时，`merged.size` 仍是 `number`。

真正会炸的是"目标要求必需属性、来源属性是 optional"，且**开关关闭时同样报错**，只是文案不同。不要把这条当成 eOPT 独有的代价。

### 最大阻力

**第三方类型定义的质量。** `@types` 包普遍写 `a?: string` 而非 `a?: string | undefined`，这是 eOPT 在既有项目上最现实的阻碍。

### 与 OpenAPI 代码生成冲突（实测）

**`@hey-api/openapi-ts@0.99.0` 生成的 client 在开启 `exactOptionalPropertyTypes` 时编译不过**——实测 `src/client/` 下十余处 TS2379 / TS2375，全是"optional 属性被赋 `| undefined`"这一类。

**生成目录被应用代码 import，所以 `exclude` 无效**（TS 会沿 import 图把它拉回来）。

处理方式，按优先级：

1. **主 tsconfig 关闭该项**，另建一个 `tsconfig.probes.json` 显式开回来、只 include 探针目录，用它做回归——这样 flag 的语义仍被测试覆盖，而应用能编译。本项目夹具采用这条路
2. 不开该项，等上游修复
3. 每次生成后跑 `--fix` 类脚本改生成物——不推荐，会被下次生成覆盖

同一个项目里同时要契约生成和 eOPT 时，**先跑一次生成再决定**：在没有 spec 的项目上可以放心开，有生成 client 的项目先验证一遍。

---

## 渐进开启

**没有任何官方 flag 支持按目录/按文件开启这两项**——它们是全项目二值的。既有项目上的做法：

1. **分 tsconfig + project references**：`tsconfig.json` 保持宽松，新增 `tsconfig.strict.json` 继承并打开这两项，先只 `include` 已治理的目录
2. **先 nUIA 后 eOPT**：nUIA 只影响索引访问的读取，改动机械（加 `!` / `??` / 改迭代）；eOPT 影响类型契约，破坏面更广、更难自动化修
3. 用 `// @ts-expect-error`（非 `@ts-ignore`）标注待整改点

配合 SKILL.md 的基线策略：既有项目上**先只确认 `strict`，把两项列为后续项**，不要一次全开。

---

## TS 7 的移除项

`alwaysStrict=false`（TS5108）、`outFile`（TS5102）、`target: es5`（TS5108）、`module: none` 在 TS 7 已移除。`alwaysStrict` 现在是 `default: true` 且不可关。

## 验证

```bash
npx tsc --noEmit --showConfig
```

**不要只看 `tsconfig.json` 里写了什么**——`extends` 链、被覆盖的值、`files`/`include` 的实际范围都会影响结果。`--showConfig` 打印的是最终生效配置。

再跑一次 `npx tsc --noEmit` 看实际报错规模。既有项目上首次开启必然大量报错，这只报告计数，不在本步骤清理。

## 出处

要点 2 的推荐选项。语义与类型变化矩阵来自官方 tsconfig reference、release notes 与本机实测（2026-09）。
