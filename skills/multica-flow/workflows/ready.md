# 就绪加载

> 共享前置节点：任何入口路由到业务节点前先走本节点。出口：本地持有 issue 全文与评论流，供后续节点使用。

## Profile 检查（有 `--profile` 参数时）

- `multica --profile <name> config show` — server_url、workspace_id 非空
- `multica --profile <name> workspace list` — 验证 token 有效、API 连通
- 任一失败 → 报错拒绝：列出缺什么/错误原因，提示 `multica login`/`config set` 补齐或换 profile，流程不继续
- 无参数 → 跳过，用默认 profile
- 本流程其余 multica 命令统一带 `--profile <name>`；无参数时省略

## 查池子与打开 issue

1. 查池子：`multica issue list --profile <name> --output json`
   - assignee 不明确时：`multica agent list --profile <name> --output json` 确认
2. 打开 issue：
   - `multica issue get <id> --profile <name> --output json` 拿全文
   - 评论两段有界读：`comment list <id> --profile <name> --roots-only --summary --output json` 扫根；命中相关线程才用 `--thread <thread-id> --tail <n>` 展开
   - agent 视角对照：workdir 的 `.agent_context/issue_context.md`（issue ID、触发方式、handoff note、可用 skills）。仅 agent 首次运行后存在；新 issue 尚无则跳过

完成：本地持有 issue 全文、评论流（根扫描 + 已展开的相关线程）、agent 视角对照（已有运行时）；合并请求状态留「交付审查」节点统一取
