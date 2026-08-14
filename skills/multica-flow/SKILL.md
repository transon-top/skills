---
name: multica-flow
description: 人工总控工作流：反复追问打磨需求直至可验证 → 指派 multica agent 执行 → 审查交付、疑问发回返工 → 人工验收 → 合并收口。斜杠触发（/multica-flow）。
user-invocable: true
argument-hint: "[--profile <name> | --P <name>] [自然语言描述 | issue-id]"
---

# multica-flow

总控工作流，把"本地打磨想法"和"multica 分派执行"接成一个闭环。

## 前提

本地已装 multica-ai/multica 官方 `multica-*` skills——平台操作契约在那边，本 skill 只做编排；缺失提示可用 `npx skills add multica-ai/multica` 安装（装进本地 Claude 环境供编排参考；与 `multica skill import` 装入工作区 DB 供 agent 绑定是两层，勿混）。
另有 `grilling`（打磨追问模式）与 `code-review`（交付审查）全程复用，运行前确认在可用 skill 列表；或功能相似的 skill。

## 触发入口

调用原文透传：`ARGUMENTS: $ARGUMENTS`，按下列规则解析。

可选 profile 前缀：`--profile <name>` 或 `--P <name>`（`--P` 为 skill 层简写，执行时统一展开为 `--profile`，CLI 不认）。须位于参数开头，提取后剩余部分按下列入口判定；无前缀 → 默认 profile。

- `/multica-flow`（无参）— 罗列能力菜单（新任务 → 「明确需求」 / 已有 issue → 「交付审查」 / 「人工验收」 / 「合并收口」 / 「修复留档」），由用户选下一步
- `/multica-flow <issue-id>` — 打开已有 issue，先「就绪加载」，按平台状态路由：
  - 评论含验收信号「人工验收通过，准予合并」→ 「合并收口」
  - 描述含「留档、不派执行」标注 → 留档场景：合并请求未合并 → 「合并收口」；已合并 → 「收尾」
  - 已有交付待审（final comment / 合并请求）→ 「交付审查」
  - 尚无交付 / 未指派 → 「明确需求」
  - 判不明 → 问用户
- `/multica-flow <自然语言描述>` — 自由描述想做的事，意图分析映射节点：新任务/打磨/指派 → 「明确需求」→「工作指派」；审查/返工/看交付 → 「交付审查」；验收 → 「人工验收」；合并 → 「合并收口」；留档/补记录/本地已修完/开 MR 留档 → 「修复留档」→「合并收口」。意图结论**回显确认**后再走节点（如「理解为：合并 MUL-123，走『合并收口』？」），歧义 → 列菜单 + 问用户

路由判定：`<issue-id>` 形如 `MUL-2759`（字母数字连字符、无空格）；含空格或中文 → 自然语言描述。

## 确认门总则

只读不确认；动作类（开工、写评论、不可逆操作）确认后执行。清单按场景分批，一次确认一批：

- 评论类：**全文预览** + 目标 thread/agent——用户确认的就是写进 issue 的原文
- 动作类：命令 + 影响（cancel 哪个、换到谁、开工参数）
- 用户逐条定夺：保留 / 删改 / 撤回；全部撤回 → 直接走「收尾」
- 只执行确认条目。追问用户主动发起即确认；`blocked` 修正重发属执行细节，不重复确认
- **单发**：已确认动作每条只执行一次，成功即止。成功以平台侧为准——评论已在 issue 里、issue 已建、状态已变更——不以命令退出码或输出解析为准；报错/解析失败先查平台现状，确未生效才补发一次，生效后绝不重发

## 节点

执行步骤在各节点文件内，进入时按需读取。加载约定：任何入口先 `workflows/ready.md` → 路由目标节点 → 出口 `workflows/close.md`；节点间跳转直接读目标文件。正文引用流程一律用「」括名称，不得改写为其他叫法。

主链（同会话按序前进，分支见下）：

1. **就绪加载**（`workflows/ready.md`）— 共享前置：profile 检查、issue 全文、评论流、agent 视角；任何入口先走本节点
2. **明确需求**（`workflows/clarify.md`）— 打磨需求（grilling）至可验证 + 审定义
3. **工作指派**（`workflows/assign.md`）— 建 issue / 更新 spec / 文档同步 sub-issue
4. **交付审查**（`workflows/deliver.md`）— 读交付、拉代码、审查、罗列质疑
5. **质疑确认**（`workflows/confirm.md`）— 罗列质疑清单，人工定夺
6. **发回**（`workflows/send-back.md`）— 质疑 comment 发回 agent，处理 trigger_outcomes
7. **人工验收**（`workflows/accept.md`）— 本地验收 + 迭代补充，结论落平台
8. **合并收口**（`workflows/merge.md`）— 合并、清理分支、切回 main
9. **收尾**（`workflows/close.md`）— 共享出口：汇报 + 询问下一步 + backlog 提升

分支：4 有质疑 → 5 → 6 → 9；4 无质疑 → 7。7 通过 → 8 → 9；7 不通过 → 5（属当前合并请求范围）或回 2（单独子任务）。2 不够格派单 → 回 2 重打磨。留档场景 → 修复留档 → 8 → 9。

平行场景：

- **修复留档**（`workflows/record.md`）— 本地修复已完成、不派执行：提交推送 → 开合并请求 → 建留档 issue → 回补合并请求关联
