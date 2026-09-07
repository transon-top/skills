# 发回

> 进入：「质疑确认」有确认发回条目。每条疑问一条 comment 发回 agent，触发返工。

- 只发确认条目：每条疑问一条 comment，格式按 `templates/comment.template.md`（正文写工作目录内渲染文件，勿 /tmp）
- 发送：`multica issue comment add <id> --content-file <渲染文件> --profile <name>`——正文用 `--content-file`（与官方 agent 约定一致；`--content` 会解码 `\n` 等转义且长多行易坏）；路径在 cwd 外则加 `--allow-external-file`
- 触发：`[@agent](mention://agent/<uuid>)`。UUID 从 `multica agent list --profile <name> --output json` 取，勿用名字。写前加载 `multica-mentioning`。新疑问评论发顶层即可，无需 `--parent`
- 后续追问：接原 thread——`multica issue comment add <id> --parent <thread-root> --content-file <渲染文件> --profile <name>`；用户主动发起即确认，勿自行补问
- **评论发布防重（单发）**：`comment add` 报错或输出解析失败 ≠ 发布失败。按总则单发——重发前先 `multica issue comment list <id> --profile <name>` 核对内容是否已落库；成功与否以平台侧评论存在性为准，不以 CLI 退出码/输出解析为准
- **CLI 输出解析提示**：人类日志行（如 `Comment added to issue <id>.`）走 **stderr**，`--output json` 的 stdout 是纯 JSON，可直接 `json.loads`，无需剥离日志行
- 发布后必读 `trigger_outcomes`（写入响应 JSON，字段 status / reason_code / target_id / target_type），按官方 reason_code 分流。注意：该字段只含**显式 mention** 触发，隐式 assignee 触发不出现在这里——本节点发触发评论，必须带显式 mention 才能观测分流
- 若 run 未按预期入队，用 `multica issue runs <id> --profile <name>` 观测（run 对象含 id / trigger_comment_id / status / trigger_summary）
  - `blocked` + `invocation_not_allowed` → 该码故意歧义（UUID 抄错与权限拒绝同码）——先 `multica agent list --profile <name> --output json` 对照 live roster 的 UUID，修正再发（执行细节，不重复确认），勿先动权限设置
  - `blocked` + `target_unavailable` → 非合法 UUID 或 agent 已归档：对照 roster 修正 UUID；归档则换 agent（走确认门）。与 runtime 无关，不查 runtime
  - `blocked` + `runtime_offline` → agent 失联或未绑定 runtime：`multica runtime list --profile <name>` 查同一 profile 的 runtime（`last_seen_at` 判断在线），必要时换 agent（走确认门）。重发无意义
  - `coalesced`/`deferred` → 目标已有同 issue 挂起任务，comment 已折叠进任务会被读到，不重发；任务完成后若仍未生效再补发
- **重复触发收敛**：若发现同一内容评论重复触发（runs 列表多个任务 / 多份重复评论），确认多余任务后 `multica issue cancel-task <task-id> --profile <name>` 取消，重复评论标注或删除，不留冗余

完成：确认条目全部落成 comment 且无 `blocked`（或已升级处理），无一留在会话里；出口「收尾」
