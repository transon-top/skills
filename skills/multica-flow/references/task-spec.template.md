## 任务：<一句话标题，与 issue title 一致>

> 本模板由 multica-flow「打磨指派」流程打磨后填充；所有「待打磨」标记在派单前必须消除。
> 派单 CLI 要素（title / assignee / status / project / priority / due-date）不进本文件——它们是 `multica issue create` 参数。
> profile 亦为 CLI 参数：multica-flow 带 `--profile <name>` 时，create/update 统一追加该 flag；无参数时省略。
> 称谓约定：本文「合并请求」为通用称谓——GitHub 称 PR、GitLab 称 MR，全篇统一用「合并请求」。

## 背景与目标

为什么做：<现状痛点 / 需求来源，一句到三句>

完成后是什么样：<结果态描述，供 agent 建立心智模型>

## 范围

### 做

- <明确要做的事，逐条列出>

### 不做（明确排除）

- <明确不做的事——防止 agent 扩大边界>

## 验收标准

> 每条必须可用命令或状态断言验证；无法断言的不进标准。
> 示例：「`pnpm test` 通过且新增用例覆盖 X」「`curl <端点>` 返回 200 与预期 JSON」。

- [ ] <断言 1>
- [ ] <断言 2>

## 文档待办

> 相关文档失配条目（grill 打磨中发现的过时点），随本任务一并交付。每条必须可命令断言，无法断言的不进本节。
> 与主任务无关的失配不进本节——走文档同步 sub-issue（backlog，收尾时提示提升）。

- [ ] 文件：<CONTEXT.md / ADR-xxx / README.md>
  - 变动：<过时点描述与修订内容>
  - 断言：<`git diff` / `grep` 可查的断言，如「`git diff <base>..HEAD -- CONTEXT.md` 中新增「X」小节且含关键词 Y」>

## 上下文

- 仓库 / 本地路径：<repo URL 或 workdir 内路径>
- 相关 issue / 合并请求：<引用，便于 agent 追溯>
- workdir 内参考文件：<issue_context.md、ADR、CONTEXT.md 等>

## 交付要求

- 代码变更需开合并请求；其标题 / 正文 / 分支带本 issue key（如 `MUL-xxxx`）以便回链
- 期望合并后自动关闭本 issue：title/body 紧邻 `Closes MUL-xxxx`（close 关键字紧邻 key）；缺紧邻则合并后 issue 不会自动 done
- final comment 列变更清单 + 验证结果 + 合并请求 URL；未开合并请求必须说明原因（未变代码 / 被阻塞）
- 测试 / 验证方式：<期望的验证命令>

## 约束

- <不可变的边界：不改的模块、不可用的资源、必须保留的兼容性等>
