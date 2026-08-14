# 交付审查

> 进入：issue 已有交付（final comment / 合并请求）。读交付 → 拉代码 → 审查 → 罗列质疑。出口：有质疑 → 「质疑确认」；无质疑 → 「人工验收」。合并请求状态本节点统一取。

## 读交付

- final comment：`multica issue comment list <id> --profile <name>`（变更清单/验证结果/合并请求 URL）
- 合并请求状态：`multica issue pull-requests <id> --profile <name>`。读前加载 `multica-working-on-issues`：state 单枚举 merged/closed/draft/open，`reference_only` 隐藏链接，`checks_conclusion` 看 CI。勿凭分支名或记忆推断
- 声称与直觉不符：`multica issue runs <id> --profile <name>` 对执行历史（失败/重跑/中断能解释声称）

## 拉代码

合并请求拉到本地项目（GitHub `gh pr diff` / GitLab `glab mr diff` / fetch），与 grill 底座同场，可跑可验

## 审查

- 查理解偏差：对照「就绪加载」的 agent 视角，找「agent 以为的 vs 实际要的」
- 查验收：逐条过验收标准
- 查声称：跑测试验证
- 查 close intent：合并请求 title/body 缺紧邻 `Closes MUL-xxxx`？
  - 缺 → merge 后 issue 不自动 done → 列入质疑
- 复用本地 `code-review` skill
- 返工轮次：疑问发回满 2 轮（第 3 次审查）验收仍不过 → 升级，不再原地打转：
  - 回「明确需求」重审 spec（打磨本身可能偏）
  - 或 `multica issue update --assignee-id <new> --profile <name>` 换 agent 重派；旧任务仍在飞先 `multica issue cancel-task <id> --profile <name>`

完成：质疑清单成型（或确认无质疑）；有质疑 → 出口「质疑确认」，无质疑 → 出口「人工验收」
