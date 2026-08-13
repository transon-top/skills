---
name: multica-flow
description: 人工总控工作流：反复追问打磨需求直至可验证 → 指派 multica agent 执行 → 审查交付、疑问发回返工。斜杠触发（/multica-flow）。
user-invocable: true
argument-hint: "[--profile <name> | --P <name>]"
---

# multica-flow

总控工作流，把"本地打磨想法"和"multica 分派执行"接成一个闭环。

## 前提

本地已装 multica-ai/multica 官方 `multica-*` skills——平台操作契约在那边，本 skill 只做编排；缺失提示可用 `npx skills add multica-ai/multica` 安装（装进本地 Claude 环境供编排参考；与 `multica skill import` 装入工作区 DB 供 agent 绑定是两层，勿混）。
另有 `grilling`（打磨追问模式）与 `code-review`（交付审查）全程复用，运行前确认在可用 skill 列表；或功能相似的 skill。

## 触发入口

调用原文透传：`ARGUMENTS: $ARGUMENTS`（如 `--profile cloud 移动端布局错乱，指派 agent 调查修复`），按下列规则解析。

- `/multica-flow`（无参）— 罗列能力菜单（新任务 → 「打磨指派」 / 已有 issue → 「审查返工」 / 「人工验收」），由用户选下一步
- `/multica-flow <自然语言描述>` — 自由描述想做的事，如「移动端布局错乱，指派 agent 调查修复」；识别为新任务意图则走「打磨指派」打磨需求，「新任务」显式前缀等价
- `/multica-flow <issue-id>` — 打开已有 issue（已分派/执行中），默认走「审查返工」，需求模糊则先进「打磨指派」重新打磨

流程分四段：**就绪加载 → 打磨指派 → 审查返工 → 人工验收**。正文引用流程一律用「」括名称（如「回『打磨指派』重审 spec」），不得改写为其他叫法。

可选 profile 前缀：`--profile <name>` 或 `--P <name>`（`--P` 为 skill 层简写，执行时统一展开为 `--profile`，CLI 不认）。须位于参数开头，提取后剩余部分按上三入口判定；无前缀 → 默认 profile。

路由判定：`<issue-id>` 形如 `MUL-2759`（字母数字连字符、无空格）；含空格或中文 → 自然语言描述。

## 确认门总则

只读不确认；动作类（开工、写评论、不可逆操作）确认后执行。清单按场景分批，一次确认一批：

- 评论类：**全文预览** + 目标 thread/agent——用户确认的就是写进 issue 的原文
- 动作类：命令 + 影响（cancel 哪个、换到谁、开工参数）
- 用户逐条定夺：保留 / 删改 / 撤回；全部撤回 → 直接收尾
- 只执行确认条目。追问用户主动发起即确认；`blocked` 修正重发属执行细节，不重复确认
- **单发**：已确认动作每条只执行一次，成功即止。成功以平台侧为准——评论已在 issue 里、issue 已建、状态已变更——不以命令退出码或输出解析为准；报错/解析失败先查平台现状，确未生效才补发一次，生效后绝不重发

## 就绪加载

> 流程共用前置段，各分支入口先过此段

0. **Profile 检查**（有 `--profile` 参数时）：
   - `multica --profile <name> config show` — server_url、workspace_id 非空
   - `multica --profile <name> workspace list` — 验证 token 有效、API 连通
   - 任一失败 → 报错拒绝：列出缺什么/错误原因，提示 `multica login`/`config set` 补齐或换 profile，流程不继续
   - 无参数 → 跳过，用默认 profile
   - 本流程其余 multica 命令统一带 `--profile <name>`；无参数时该段省略
1. 查池子：`multica issue list --profile <name> --output json`
   - assignee 不明确时：`multica agent list --profile <name> --output json` 确认
2. 打开 issue：
   - `multica issue get <id> --profile <name> --output json` 拿全文
   - 评论两段有界读：`comment list <id> --profile <name> --roots-only --summary --output json` 扫根；命中相关线程才用 `--thread <thread-id> --tail <n>` 展开
   - agent 视角对照：workdir 的 `.agent_context/issue_context.md`（issue ID、触发方式、handoff note、可用 skills）。仅 agent 首次运行后存在；新 issue 尚无则跳过

完成：本地持有 issue 全文、评论流（根扫描 + 已展开的相关线程）、agent 视角对照（已有运行时）；合并请求状态（GitHub 称 PR、GitLab 称 MR）留「审查返工」6 步统一取

## 打磨指派

3. **Grill 打磨需求**（按 grilling 模式）：
   - 一次一问，每问给推荐答案
   - 事实查环境不查人，决策交给人
   - 底座：本地项目 repo（`CONTEXT.md`/ADR 在本地演进）
   - 打磨三要素：任务目标、范围边界（含明确不做的事）、可验证的验收标准——对齐 `references/task-spec.template.md`
   - **3.1 本地同步预检查**（打磨开始前）：
     - `git fetch` 全部分支 → 当前分支与远端同步检查，落后才 pull
     - 停在合并请求分支 → 自动 `git checkout main` + pull（动作类，走确认门告知）
     - fetch/pull 失败 → 报错提示，用本地现有版本继续打磨，漂移按 3.4 声明
   - **3.2 文档失配统一路径**（grill 中发现文档过时 / remote 新版本 / 对话新决策，触发源不区分）：
     - 不直接本地改动——文档是交付物，由 agent 在 remote 交付，本地只留清单
     - 相关条目（与主任务关联）→ 打磨时整理为 spec「文档待办」章节条目
     - 无关条目 → 合并一条文档同步 sub-issue（步骤 5 创建）
   - **3.3 文档确认轮**（grill 结束、进审定义前）：罗列全部文档待办条目（相关 + 无关），用户逐条定夺（保留/删改/拆分）；已确认条目写进 spec「文档待办」章节或 sub-issue 描述
   - **3.4 打磨引用口径**：本地文档过时点公开声明——任务描述不引用过时章节，以会话确认口径为准
   完成：验收标准每条都可用命令/状态断言，无人再能补充影响行为的信息；文档待办条目已确认归类
4. **审定义**（派单前质量门，三问）：
   - 验收标准可验证？
   - 范围无歧义？
   - 信息缺口都补了？
   不够 → 回 3；够 → 5
5. **指派（确认后执行）**：
   - 新任务：填 spec（按 `references/task-spec.template.md`，写 workdir 内）→ 罗列开工清单（title、assignee、status、project/priority）→ 用户确认后 `multica issue create --title <一句话> --description-file <spec> --allow-external-file --assignee-id <agent-uuid> --profile <name>`
   - 用名字也行：`--assignee <name>` 模糊匹配
   - 状态：不传 `--status` 默认 `todo` 即入队；`--status backlog` 停车
   - 无关文档待办 sub-issue（与主任务同批确认清单）：`multica issue create --title <文档同步待办 N 条> --description <逐条：文件+变动+断言> --parent <主issue-id> --status backlog --assignee-id <同主任务agent> --profile <name>`——backlog 停车不触发，收尾时提示提升
   - 已有任务重新打磨：`multica issue update --description-file <spec> --profile <name>` 更新 → 罗列触发评论全文预览 → 用户确认后 comment `[@agent](mention://agent/<uuid>)` 触发（spec 变更打磨中已背书，不重复确认）
   - 契约细节（合并请求 close 规则、comment 格式）：触发时加载 `multica-working-on-issues`、`multica-mentioning`
   完成：确认条目已执行，issue 状态非 backlog，agent 已入队，无未答复的澄清问题

## 审查返工

6. 读交付：
   - final comment：`multica issue comment list <id> --profile <name>`（变更清单/验证结果/合并请求 URL）
   - 合并请求状态：`multica issue pull-requests <id> --profile <name>`。读前加载 `multica-working-on-issues`：state 单枚举 merged/closed/draft/open，`reference_only` 隐藏链接，`checks_conclusion` 看 CI。勿凭分支名或记忆推断
   - 声称与直觉不符：`multica issue runs <id> --profile <name>` 对执行历史（失败/重跑/中断能解释声称）
7. 拉代码：合并请求拉到本地项目（GitHub `gh pr diff` / GitLab `glab mr diff` / fetch），与 grill 底座同场，可跑可验
8. 审查：
   - 查理解偏差：对照「就绪加载」的 agent 视角，找「agent 以为的 vs 实际要的」
   - 查验收：逐条过验收标准
   - 查声称：跑测试验证
   - 查 close intent：合并请求 title/body 缺紧邻 `Closes MUL-xxxx`？
     - 缺 → merge 后 issue 不自动 done → 列入质疑
   - 复用本地 `code-review` skill
   - 返工轮次：疑问发回满 2 轮（第 3 次审查）验收仍不过 → 升级，不再原地打转：
     - 回「打磨指派」重审 spec（打磨本身可能偏）
     - 或 `multica issue update --assignee-id <new> --profile <name>` 换 agent 重派；旧任务仍在飞先 `multica issue cancel-task <id> --profile <name>`
9. 罗列质疑，人工确认：
   - 审查后不自动发回：全部疑问按总则整理成确认清单，每条三段式——标准/声称原文、现状、行动（同 comment 模板）
   - 升级路径同规则：满 2 轮需升级（重审 spec / 换 agent）时一并列出，不自动执行；换 agent 一条列俩——`cancel-task` 先、`update --assignee-id` 后
   完成：用户已确认发回条目（或全部撤回），无一疑问留在会话里未定夺

10. 质疑发回：
    - 只发确认条目：每条疑问一条 comment，格式按 `references/comment.template.md`
    - 触发：`[@agent](mention://agent/<uuid>)`。UUID 从 `multica agent list --profile <name> --output json` 取，勿用名字。写前加载 `multica-mentioning`
    - 后续追问：接原 thread——`multica issue comment add <id> --parent <thread-root> --content --profile <name>`；用户主动发起即确认，勿自行补问
    - **评论发布防重（单发）**：`comment add` 报错或输出解析失败 ≠ 发布失败。按总则单发——重发前先 `comment list <id> --profile <name>` 核对内容是否已落库；成功与否以平台侧评论存在性为准，不以 CLI 退出码/输出解析为准
    - **CLI 输出解析提示**：`--output json` 时 CLI 可能先打人类日志行（如 `Comment added to issue <id>.`）再接 JSON body——解析前先看原始输出，勿直接对整段 `json.loads`
    - 发布后必读 `trigger_outcomes`，按 reason_code 分流：
      - `blocked` + `invocation_not_allowed` → roster 查 UUID 修正再发（执行细节，不重复确认）
      - `blocked` + `target_unavailable`/`runtime_offline` → agent 归档或失联：`multica runtime list --profile <name>` 查同一 profile 的 runtime，必要时换 agent（走确认门）。重发无意义
      - `coalesced`/`deferred` → 目标忙，任务已折叠。不重发
    - **重复触发收敛**：若发现同一内容评论重复触发（runs 列表多个任务 / 多份重复评论），确认多余任务后 `multica issue cancel-task <task-id> --profile <name>` 取消，重复评论标注或删除，不留冗余
    完成：确认条目全部落成 comment 且无 `blocked`（或已升级处理），无一留在会话里

## 人工验收

> 审查通过后进入

11. 停留分支：审查通过后保持合并请求分支，**不自动切回 main**——前端等有界面项目需要人工看页面效果
12. 干净检查：
    - `git status --porcelain` 空 = 无未提交改动
    - 停在合并请求分支时相对 main 有差异属正常，别误判为脏
    - 有未提交改动：提示处理（stash 或提交），不留脏状态到验收
    完成：分支停合并请求侧，无未提交改动，等人工 UI 验收

## 收尾

汇报状态摘要：已派什么、待返工什么、无合并请求原因（未变代码/被阻塞）、人工验收状态
**询问下一步，等指示**：人工 UI 验收 / 切回 main / 派下一单——切回动作由人决定，流程不代做

主任务 done 后：`multica issue list --parent <主issue-id> --profile <name>` 捞关联 backlog sub-issue（文档同步待办），罗列后问「是否提升 `todo` 派执行」，确认后 `multica issue status <child-id> todo --profile <name>`——不自动派，由人决定
