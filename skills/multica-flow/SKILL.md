---
name: multica-flow
description: 人工总控工作流：反复追问打磨需求直至可验证 → 指派 multica agent 执行 → 审查交付、疑问发回返工。斜杠触发（/multica-flow）。
user-invocable: true
---

# multica-flow

总控工作流，把"本地打磨想法"和"multica 分派执行"接成一个闭环。

## 前提

本地已装 multica-ai/multica 官方 `multica-*` skills——平台操作契约在那边，本 skill 只做编排；缺失提示可用 `npx skills add multica-ai/multica` 安装（装进本地 Claude 环境供编排参考；与 `multica skill import` 装入工作区 DB 供 agent 绑定是两层，勿混）。
另有 `grilling`（打磨追问模式）与 `code-review`（交付审查）全程复用，运行前确认在可用 skill 列表；或功能相似的 skill。

## 触发入口

- `/multica-flow`（无参）— 罗列能力菜单（新任务打磨指派 / 已有 issue 审查返工 / 人工验收），由用户选下一步
- `/multica-flow <自然语言描述>` — 自由描述想做的事，如「移动端布局错乱，指派 agent 调查修复」；识别为新任务意图则走分支一打磨指派，「新任务」显式前缀等价
- `/multica-flow <issue-id>` — 打开已有 issue（已分派/执行中），默认走分支二（审查交付），需求模糊则先进分支一重新打磨

路由判定：`<issue-id>` 形如 `MUL-2759`（字母数字连字符、无空格）；含空格或中文 → 自然语言描述。

## 阶段〇：查询与打开（两分支共用）

1. 查：`multica issue list --output json` 看池子；需要时 `multica agent list --output json` 确认 assignee
2. 打开：`multica issue get <id> --output json` 拿 issue 全文；评论两段有界读——`multica issue comment list <id> --roots-only --summary --output json` 扫根，命中相关线程再 `--thread <thread-id> --tail <n>` 展开（不无界全量拉）。若 multica workdir 有对应 `issue_context.md`，读它作为 agent 视角对照

完成：本地上下文持有 issue 全文、评论流（根扫描 + 已展开的相关线程）、agent 视角对照（`issue_context.md`）；PR 状态留 6 步统一取

## 分支一：打磨需求 → 指派执行

3. **Grill 打磨需求**：按 grilling 模式追问 — 一次一问、每问给推荐答案、事实查环境不查人、决策交给人。底座是本地项目 repo（`CONTEXT.md`/ADR 在本地演进）。打磨出：任务目标、范围边界（含明确不做的事）、可验证的验收标准
   完成：验收标准每条都可用命令/状态断言，无人再能补充影响行为的信息
4. **审定义**（派单前质量门）：需求够格才派 — 验收标准可验证？范围无歧义？信息缺口都补了？
   不够 → 回 3；够 → 5
5. **指派**：
   - 新任务：`multica issue create --description-file <打磨完成的spec> --assignee <agent-id>`（spec 写 workdir 内）
   - 已有任务重新打磨后：`multica issue update --description-file <spec>` 更新，再 comment `[@agent](mention://agent/<uuid>)` 触发
   - 契约细节（PR close 规则、comment 格式）触发时加载 `multica-working-on-issues`、`multica-mentioning`
   完成：issue 状态非 backlog，agent 已入队，无未答复的澄清问题

## 分支二：审查交付、拷问返工

6. 读交付：`multica issue comment list` 读 agent final comment（变更清单/验证结果/PR URL）；`multica issue pull-requests <id>` 拿 PR 状态——读前触发时加载 `multica-working-on-issues`（state 单枚举 merged/closed/draft/open、`reference_only` 隐藏链接、`checks_conclusion`，勿凭分支名或记忆推断）
7. 拉代码：PR 拉到本地项目（`gh pr diff` / fetch），与 grill 底座同场，可跑可验
8. 审查：对照阶段〇 的 `issue_context.md` 找理解偏差（agent 以为的 vs 实际要的）；逐条过验收标准；跑测试验证声称的结果。本地 `code-review` skill 复用
9. 质疑发回：每条疑问写成 comment `[@agent](mention://agent/<uuid>)` 触发返工或澄清——写前触发时加载 `multica-mentioning`（UUID 从 `multica agent list --output json` 取，勿用名字）；发布后必读响应 `trigger_outcomes`：`blocked` 对 roster 查 UUID 修正再发，`coalesced`/`deferred`（目标忙，任务已折叠）不重发；质疑要具体到可行动（哪个验收标准没满足、哪句声称无验证）
   完成：全部疑问落成 comment 且无 `blocked`，无一留在会话里

## 分支三：人工验收（审查通过后）

10. 停留分支：审查通过后保持 PR 分支，**不自动切回 main**——前端等有界面项目需要人工看页面效果
11. 干净检查：`git status` 确认工作区干净；有未提交改动则提示处理（stash 或提交），不留脏状态到验收
    完成：分支停 PR 侧，工作区干净，等人工 UI 验收

## 收尾

汇报状态摘要：已派什么、待返工什么、无 PR 原因（未变代码/被阻塞）、人工验收状态
**询问下一步，等指示**：人工 UI 验收 / 切回 main / 派下一单——切回动作由人决定，流程不代做
