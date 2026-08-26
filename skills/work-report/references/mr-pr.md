# 合并请求（MR/PR）查阅

## 识别平台与预检

- 从 `git remote -v` 的 URL 识别平台：`github.com` → 用 `gh`；`gitlab.com` 或自托管 GitLab 实例 → 用 `glab`
- 预检三条件，任一失败即降级：
  1. 对应 CLI 存在：`which gh` / `which glab`
  2. 认证可用：`gh auth status` / `glab auth status`（多实例时 glab 会逐一列出，找到目标 remote 实例标记为已登录）
  3. 仓库在平台可寻址：remote URL 有平台路径（能推断 `owner/repo`）

**降级链**：预检失败 → 不拉取，回退到 merge commit 消息解析（纯 git：从 `Merge branch '<branch>' into '<target>'` 提取分支名，作「谁做的」背景素材；无 MR 标题/描述/评审信息）→ 再不足则纯 git 流程 + 报告标注「MR 信息缺失及原因」。

## 拉取已合并 MR/PR 列表

按窗口拉取，平台命令：

- **GitHub**（以 merged 时间过滤，附 mergeCommit oid 供精确配对）：

```bash
gh pr list --state merged --search "merged:>=<start-date>" --limit 100 \
  --json number,title,mergedAt,mergeCommit,author,reviews \
  --jq '.[] | {number, title, mergedAt, mergeCommit: .mergeCommit.oid, author: .author.login, reviews: [.reviews[] | {state, author: .author.login}]}'
```

- **GitLab**（REST 列表接口按 `merged_after` 精确过滤；自托管实例需登录对应 host）：

```bash
glab api "projects/:id/merge_requests?state=merged&merged_after=<start-date>T00:00:00Z&per_page=100"
```

> 注意：GitLab 列表接口不含 `merge_commit_sha`（实测为空），故 GL 侧配对走「配对到本地提交」节的分支名 ↔ merge commit 消息配对；GitHub 侧含 mergeCommit oid 直接精确配对。

字段需求：MR 编号（number/iid）、标题、描述、merged_at、author、reviewers、merge_user、squash_commit_sha（若有）、source_branch（GL）。

若窗口内已合并 MR/PR 数为 0，跳过配对，直接进入纯 git 流程。

## 配对到本地提交

三种机制按优先级应用：

1. **GH 精确匹配**：`mergeCommit.oid` 存在于本地 `git cat-file -t` 即配对成功
2. **GL 分支名匹配**：MR 的 `source_branch` 与 merge commit 消息解析出的分支名（`Merge branch '<branch>' into '<target>'`）精确一致即配对
3. **日期窗口兜底**：其余按 `merged_at` 日期与本地合并/FF commit 对齐（±1 天），仍无对应则只作背景素材，不参与交付日

**完成标准**：MR/PR 列表已拉取并尝试全部配对；每个 MR 记录配对状态（精确/分支名/日期兜底/未配对）；squash 型 MR 记录其 `squash_commit_sha` 对应的本地 commit（squash 粒度经 MR 数据还原）。

## 交付日校准

- MR 配对成功的条目：交付日 = 平台 `merged_at`（日期取整即可）；并将该 MR 的标题/描述作为背景素材关联到其引入的 commits
- **偏差仲裁**：平台 `merged_at` 与本地 merge commit 日期偏差 > 1 天的条目，在确认点列出，由用户裁决以谁为准

未匹配 MR 的条目保持纯 git 口径（merge commit 日 / 提交日）。

## 数据利用

- **背景素材优先级**（full 模式）：MR 标题/描述 → ticket 主线 → merge 分支名（谁做的）→ commit messages
- **ticket 聚合**：ticket ID 提取来源扩展——该 MR 标题/描述提取的 ticket 优先（该 MR 下全部 commits 继承此 ticket）；缺失时回退到 commit subject 提取
- **协作信息**：评审人 + 合并人写入背景注记（如「由 X 评审、Y 合并」）；报告头部列 MR/PR 数

## 边界

- squash 流：粒度塌缩后无法从纯 git 还原，但 MR 数据（`squash_commit_sha` + 标题/描述）可还原粒度，已纳入覆盖范围（需平台可用）。平台不可用时按纯 git 口径并标注
- 平台自动发现：GitHub → `gh`，GitLab（含自托管）→ `glab`；不硬编码仓库清单
- 降级链见「识别平台与预检」节
