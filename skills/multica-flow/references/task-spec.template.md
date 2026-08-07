# 任务：<一句话标题，与 issue title 一致>

> 本模板由 multica-flow 分支一打磨后填充；所有「待打磨」标记在派单前必须消除。
> 派单 CLI 要素（title / assignee / status / project / priority / due-date）不进本文件——它们是 `multica issue create` 参数。

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

## 上下文

- 仓库 / 本地路径：<repo URL 或 workdir 内路径>
- 相关 issue / PR：<引用，便于 agent 追溯>
- workdir 内参考文件：<issue_context.md、ADR、CONTEXT.md 等>

## 交付要求

- 代码变更需开 PR；PR 标题 / 正文 / 分支带本 issue key（如 `MUL-2759`）以便回链
- 期望合并后自动关闭本 issue：正文用 `Closes MUL-2759`（close 关键字紧邻 key）
- final comment 列变更清单 + 验证结果 + PR URL；未开 PR 必须说明原因（未变代码 / 被阻塞）
- 测试 / 验证方式：<期望的验证命令>

## 约束

- <不可变的边界：不改的模块、不可用的资源、必须保留的兼容性等>
