# 簇一 类型与契约

覆盖两个要点：**别猜 API 字段**、**打开 strict TypeScript**。共同点是把"某处可能存在某值"这件事从推测变成声明。

## 要防的缺陷

AI 写前端最典型的错误是**不存在的字段**——代码里写 `user.fullName`，后端返回的是 `firstName` / `lastName`。

关键在于：**TypeScript 类型若与 API contract 分开写，会同样出错**。类型对了只是因为你照着猜的写了两遍。

2025 Stack Overflow 调查里，AI 使用者的最大痛点选项是 "almost right, but not quite"（66%），遥遥领先。契约优先要解决的就是这一类"差一点"。

## 原则

**contract 是唯一权威源。** spec 描述前后端共享的唯一真相，类型、client、运行时校验全部由它派生。手写类型是第二份真相，必然分叉。

**生成物入库但不逐行 review。** 生成代码没人会读，手改会被下次生成覆盖。review 成本从数百行生成代码转移到更小的 contract 上——这才是收益所在。

**类型只在编译期，响应在运行期到达。** 编译期类型对了不代表运行期数据对：后端可能违约、可能是旧版本、可能是代理改写的响应。所以需要运行时校验做第二道闸门。

**没有 spec 就跳过这一簇。** 不要凭空生成一份 `openapi-ts.config.ts` 留空 `input`——用户会以为配好了，实际一跑就报错。报告中写明"不适用：未找到 OpenAPI spec"。

## 步骤

1. 检测 spec：`openapi.{json,yaml,yml}`、`swagger.*`、`package.json` 里的 spec 相关依赖，或后端提供的 URL
2. 问用户 spec 的权威位置（URL 还是本地文件），以及后端是否持续更新它
3. 装依赖、生成 `openapi-ts.config.ts`、跑一次生成确认产物结构
4. 在规范里写明：生成目录不手改；spec 变更后需重跑生成

配置细节 → `tools/openapi-ts.md`。

## strict TypeScript

三个开关，逐个开启：

- **`strict`** —— 基础。若已在 `extends` 链的某个 base config 里，不重复写
- **`noUncheckedIndexedAccess`** —— 开启前 `arr[0]` 被当成一定存在；开启后类型变成"element or undefined"。它逼你处理越界，代价是大量既有代码需要加判断或非空断言
- **`exactOptionalPropertyTypes`** —— 缩小"类型声明"与"实际取值"之间的差距，区分"属性不存在"和"属性存在但值为 undefined"

**TS 5.9 起 `tsc --init` 已把后两项默认写成 `true`**——新项目上这一步往往是"确认已开"而非"打开"。先读 `tsconfig.json` 再动手。

语义、破坏场景与渐进开启方式 → `tools/tsconfig.md`。

**注意：`no-non-null-assertion` lint 规则与 `noUncheckedIndexedAccess` 会互相拉扯**——前者禁止你用 `!` 消掉后者引入的 `undefined`。两者同开时，正确解是补真实的判断，不是关掉其中一个。若项目存量代码里 `!` 很多，先开 lint 规则（`warn`）观察一段时间，再开编译器选项。

## 判据

- 类型是否从 spec 生成？若是手写，它和 spec 的一致性靠什么保证？
- 生成目录是否被 lint / format 排除？（生成物不该被项目规则反复改写）
- 响应在运行期是否校验过？
- strict 三开关是否真的生效？（跑 `npx tsc --noEmit --showConfig` 确认，不要只看 `tsconfig.json` 里写了什么）

## 出处

要点 1「Stop guessing API fields with OpenAPI」、要点 2「Turn on strict TypeScript」。
