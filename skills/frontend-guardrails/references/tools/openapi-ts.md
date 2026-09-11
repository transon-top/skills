# @hey-api/openapi-ts + zod

对应要点 1。从 OpenAPI spec 生成类型、client 与 Zod schema，消灭"猜字段"。

**升级前读 changelog。** API 面会在小版本里变，而生成物被应用代码 import，一次生成就能带进成片的类型错误。

## 前置条件

**没有 spec 就不做这一步。** 先检测：`openapi.{json,yaml,yml}`、`swagger.*`、`package.json` 里的 spec 相关依赖，或后端提供的 URL。找不到就跳过并在报告中写明原因——不要生成一个留空 `input` 的配置，那会让用户以为配好了、实际一跑就报错。

## 安装

```bash
pnpm add -D @hey-api/openapi-ts
pnpm add zod          # 只有加了 zod 插件才需要
```

**`typescript` 是硬性 peer**（`>=5.5.3`），不装直接跑 CLI 会崩（`Cannot read properties of undefined (reading 'AnyKeyword')`）。

**不需要单独安装 client 包**（`@hey-api/client-fetch` 等）。v0.73.0 之前需要，现在已是内置插件，官方明确说应当卸载。

## 配置

```ts
// openapi-ts.config.ts
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi.json",
  output: "src/client",
  plugins: [
    "@hey-api/client-fetch",
    "@hey-api/typescript",
    "@hey-api/sdk",
    "zod",
  ],
});
```

`openapi-ts.config.ts` **会被自动发现**，不必传 `-f`。`defineConfig` 是纯类型辅助，运行时可省略。

### `input` 支持的取值

| 形式 | 支持 |
| ---- | ---- |
| 本地 `./openapi.json` | ✅ |
| 本地 `./openapi.yaml` | ✅ |
| 对象 `{ path: "./openapi.json", watch: true }` | ✅ |
| URL / API registry 简写 | ✅（需联网） |
| **目录 `./specs`** | ❌ `EISDIR` |

**目录输入是常见误解，实测不支持。** 多份 spec 用数组或多次运行。

### `plugins` 的两个坑

1. **zod 插件名是短名 `"zod"`**。`"@hey-api/zod"` 这个写法**不存在**（它是内置 plugin 名而非独立包）。同理 `"valibot"`、`"arktype"`、`"msw"`、`"orpc"` 都是短名；`@hey-api/typescript` 与 `@hey-api/sdk` 带前缀
2. **一旦显式写 `plugins`，默认项不会被自动补上**。省略 `plugins` 时默认是 `['@hey-api/typescript', '@hey-api/sdk']`；写了 `plugins: ['zod']` 就**只**产出 `zod.gen.ts`

内置插件共 29 个，含各框架的 query 集成（`@tanstack/react-query`、`@tanstack/vue-query`、`swr`、`@pinia/colada` 等）与各 HTTP client（fetch / axios / ky / next / nuxt / ofetch / angular）。

### 生成目录

`output: "src/client"` 且挂 fetch + typescript + sdk + zod 时：

```text
src/client/
├── index.ts          ← barrel
├── client.gen.ts
├── sdk.gen.ts
├── types.gen.ts
├── zod.gen.ts        ← 仅加了 zod 插件
├── client/
│   ├── client.gen.ts
│   ├── types.gen.ts
│   └── utils.gen.ts
└── core/
    └── ...
```

**生成物外部依赖只有 `zod` 一个**，其余全是相对路径。

### scripts

```json
{ "scripts": { "openapi-ts": "openapi-ts" } }
```

watch 模式：`pnpm exec openapi-ts -w`，或配置里 `input: { path: "./openapi.json", watch: true }`。

## Zod 用法

生成物命名约定 `z<OperationName><Part>`（如 `zGetPetByIdResponse`）。**只做运行时解析**的典型写法：

```ts
import { zGetPetByIdResponse } from "./client/zod.gen";

const res = await fetch("/pets/1");
const json: unknown = await res.json();

const parsed = zGetPetByIdResponse.safeParse(json);
if (!parsed.success) {
  throw new Error(`响应校验失败: ${parsed.error.message}`);
}
const pet = parsed.data; // 已校验
```

也可以把校验接进 SDK 本身（sdk 插件的 `validator` 配置，取值 `'zod' | 'valibot' | 'arktype' | false`）。

### 版本选项是 `compatibilityVersion`

**不是 `version`。** 写 `{ name: "zod", version: "v3" }` **不报错但被静默忽略**，仍产出 Zod 4 风格——很隐蔽的坑。

```ts
plugins: [{ name: "zod", compatibilityVersion: 4 }]   // 默认
plugins: [{ name: "zod", compatibilityVersion: 3 }]   // 产出 import { z } from 'zod/v3'
plugins: [{ name: "zod", compatibilityVersion: "mini" }]
```

v4 相对 v3 的破坏性变更（issue 类型体系整体重命名、`z.record()` 不再接受单参数、`z.string().url()` → `z.url()`、对象 + `coerce` 的行为变化）只在与既有 Zod 代码共用时才会撞上——生成物本身是新写的，不受影响。

## 两个实测坑

### tsconfig 的 `exactOptionalPropertyTypes` 与生成物冲突

**生成的 client 在开启 `exactOptionalPropertyTypes` 时编译不过**——实测十余处 TS2379 / TS2375。生成目录被应用代码 import，`exclude` 绕不开。取舍见 `tsconfig.md`。

引入本工具前，先确认项目的该项设置；已经开了的要如实报告冲突，不要默默改掉。

### 生成目录要排除出各检查

- **lint**：加进 `eslint.config.js` 的全局 `ignores`
- **knip**：加进 `ignore`
- **jscpd**：加进 `ignore`
- **boundaries**：**要声明成 element 类型**，否则哨兵规则 `boundaries/no-unknown-dependencies` 会对 `@/client` 这类导入报 unknown（见 `boundaries.md`）

knip 的盲区：忽略生成目录后，生成物用到的运行时依赖（如 `zod`）会被报成 unused。加进 `ignoreDependencies` 并在规范里注明原因，否则半年后没人知道为什么 ignore 里躺着 zod。

## 规范里要写明的

- **生成目录不手改**，spec 变更后重跑生成命令
- 与后端响应相关的类型**从 spec 派生，不手写**
- 生成目录要排除在 lint / format 之外（生成物不该被项目规则反复改写），并加进 `knip` 的 `ignore`（否则会报一堆未使用的导出）

## 验证

```bash
pnpm exec openapi-ts
```

确认：产物目录结构符合预期（有 `types.gen.ts`，加了 zod 就有 `zod.gen.ts`）、`index.ts` barrel 导出正常、TypeScript 能编译生成物。

用 `--dry-run` 可以先看会写什么。

**spec 来源不可达（无网络、需鉴权）时**，标注未验证并写进报告，不要假装生成成功。

## 出处

要点 1 的推荐工具。配置细节取自 0.99.0 发布包源码与实跑验证（2026-09）。
实测自 `@hey-api/openapi-ts@0.99.0`（2026-09，配置细节与生成产物结构）。
