# 发回

> 进入：「质疑确认」有确认发回条目。每条疑问一条 comment 发回 agent，触发返工。

- 只发确认条目：每条疑问一条 comment，格式按 `templates/comment.template.md`
- 触发：`[@agent](mention://agent/<uuid>)`。UUID 从 `multica agent list --profile <name> --output json` 取，勿用名字。写前加载 `multica-mentioning`
- 后续追问：接原 thread——`multica issue comment add <id> --parent <thread-root> --content --profile <name>`；用户主动发起即确认，勿自行补问
- **评论发布防重（单发）**：`comment add` 报错或输出解析失败 ≠ 发布失败。按总则单发——重发前先 `comment list <id> --profile <name>` 核对内容是否已落库；成功与否以平台侧评论存在性为准，不以 CLI 退出码/输出解析为准
- **CLI 输出解析提示**：`--output json` 时 CLI 可能先打人类日志行（如 `Comment added to issue <id>.`）再接 JSON body——解析前先看原始输出，勿直接对整段 `json.loads`
- 发布后必读 `trigger_outcomes`，按 reason_code 分流：
  - `blocked` + `invocation_not_allowed` → roster 查 UUID 修正再发（执行细节，不重复确认）
  - `blocked` + `target_unavailable`/`runtime_offline` → agent 归档或失联：`multica runtime list --profile <name>` 查同一 profile 的 runtime，必要时换 agent（走确认门）。重发无意义
  - `coalesced`/`deferred` → 目标忙，任务已折叠。不重发
- **重复触发收敛**：若发现同一内容评论重复触发（runs 列表多个任务 / 多份重复评论），确认多余任务后 `multica issue cancel-task <task-id> --profile <name>` 取消，重复评论标注或删除，不留冗余

完成：确认条目全部落成 comment 且无 `blocked`（或已升级处理），无一留在会话里；出口「收尾」
