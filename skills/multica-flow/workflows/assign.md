# 工作指派

> 进入：「明确需求」完成（spec 已就绪）。产出：issue 建好、agent 入队。动作类，确认后执行。

## 派单

- 新任务：填 spec（按 `templates/task-spec.template.md`，写 workdir 内）→ 派单前检查：spec 全文不含 `templates/` 等技能内部路径、格式约束已内联自足 → 罗列开工清单（title、assignee、status、project/priority）→ 用户确认后 `multica issue create --title <一句话> --description-file <spec> --allow-external-file --assignee-id <agent-uuid> --profile <name>`
- 用名字也行：`--assignee <name>` 模糊匹配
- 状态：不传 `--status` 默认 `todo` 即入队；`--status backlog` 停车
- 无关文档待办 sub-issue（与主任务同批确认清单）：`multica issue create --title <文档同步待办 N 条> --description <逐条：文件+变动+断言> --parent <主issue-id> --status backlog --assignee-id <同主任务agent> --profile <name>`——backlog 停车不触发，收尾时提示提升
- 已有任务重新打磨：`multica issue update --description-file <spec> --profile <name>` 更新（spec 同过派单前检查）→ 罗列触发评论全文预览 → 用户确认后 comment `[@agent](mention://agent/<uuid>)` 触发（spec 变更打磨中已背书，不重复确认）
- 契约细节（合并请求 close 规则、comment 格式）：触发时加载 `multica-working-on-issues`、`multica-mentioning`

完成：确认条目已执行，issue 状态非 backlog，agent 已入队，无未答复的澄清问题
