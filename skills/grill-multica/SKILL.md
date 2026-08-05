---
name: grill-multica
description: 人工总控工作流：磨需求 → 指派 multica agent → 拷问交付。斜杠触发（/grill-multica）。
user-invocable: true
---

# grill-multica

总控工作流，把"本地磨想法"和"multica 分派执行"接成一个闭环。底层操作语言在 `multica-*` skills 里，本 skill 只做编排，不重复平台契约。

## 触发入口

- `/grill-multica <issue-id>` — 打开已有 issue（已分派/执行中），默认走分支二（拷问），需求模糊则先进分支一重磨
- `/grill-multica 新任务 <主题>` — 从空查起，走分支一（磨 → 派）

## 阶段 0：查询与打开（两分支共用）

1. 查：`multica issue list --output json` 看池子；需要时 `multica agent list --output json` 确认 assignee
2. 打开：`multica issue get <id> --output json` + `multica issue comment list <id> --output json`，issue 全文 + 全部评论 + 关联 PR 进上下文。若 multica workdir 有对应 `issue_context.md`，读它作为 agent 视角对照

完成：本地上下文持有 issue 全文、完整评论流、PR 状态；知道 agent 当时怎么理解这任务

## 分支一：磨 → 派

3. **Grill 磨需求**：按 grilling 模式追问 — 一次一问、每问给推荐答案、事实查环境不查人、决策交给人。底座是本地项目 repo（`CONTEXT.md`/ADR 在本地演进）。磨出：任务目标、范围边界（含明确不做的事）、可验证的验收标准
   完成：验收标准每条都可用命令/状态断言，无人再能补充影响行为的信息
4. **审定义**（拷问左端）：需求够格才派 — 验收标准可验证？范围无歧义？信息缺口都补了？
   不够 → 回 3；够 → 5
5. **指派**：
   - 新任务：`multica issue create --description-file <磨好的spec> --assignee <agent-id>`（spec 写 workdir 内）
   - 已有任务重磨后：`multica issue update --description-file <spec>` 更新，再 comment `[@agent](mention://agent/<uuid>)` 触发
   - 契约细节（PR close 规则、comment 格式）触发时加载 `multica-working-on-issues`、`multica-mentioning`
   完成：issue 状态非 backlog，agent 已入队，无未答复的澄清问题

## 分支二：拷问交付

6. 读交付：`multica issue comment list` 读 agent final comment（变更清单/验证结果/PR URL）；`multica issue pull-requests <id>` 拿 PR 状态
7. 拉代码：PR 拉到本地项目（`gh pr diff` / fetch），与 grill 底座同场，可跑可验
8. 审查：对照阶段 0 的 `issue_context.md` 找理解偏差（agent 以为的 vs 实际要的）；逐条过验收标准；跑测试验证声称的结果。本地 `code-review` skill 复用
9. 质疑发回：每条疑问写成 comment `[@agent](mention://agent/<uuid>)` 触发返工或澄清；质疑要具体到可行动（哪个验收标准没满足、哪句声称无验证）
   完成：全部疑问落成 comment，无一留在会话里

## 收尾

汇报状态摘要：已派什么、待返工什么、无 PR 原因（未变代码/被阻塞）、下一步建议
