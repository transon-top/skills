# 收尾

> 共享出口节点：每个节点流程收尾走本节点。

- 汇报状态摘要：已派什么、待返工什么、无合并请求原因（未变代码/被阻塞）、人工验收状态
- **询问下一步，等指示**：人工 UI 验收 / 切回 main / 派下一单——切回动作由人决定，流程不代做（合并成功后「合并收口」已自动切回，其余情况不自动）
- 主任务 done 后：`multica issue list --parent <主issue-id> --profile <name>` 捞关联 backlog sub-issue（文档同步待办），罗列后问「是否提升 `todo` 派执行」，确认后 `multica issue status <child-id> todo --profile <name>`——不自动派，由人决定
