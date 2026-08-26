---
name: work-report
argument-hint: '[--days N] [--authors name1,name2] [--mode lite|full] [--output <dir>]'
description: 从 git 提交历史与远端 MR/PR 数据整理工作汇报（日报/周报/月报），支持按天数、作者、颗粒度筛选。仅手动 `/work-report` 调用。
disable-model-invocation: true
---

# /work-report

从 git 提交历史整理工作汇报（日报/周报/月报）。git 提交为基线；MR/PR 数据为可选增强层（背景素材、交付口径、协作信息），仅在用户询问确认需要时查阅，细节见 `references/mr-pr.md`。

**交付日口径**：工作归入其交付当天，而非提交当天。纯 git 口径下——merge commit 流交付日 = 合并日；直推/FF 流交付日 = 提交日。查阅 MR/PR 时以平台 `merged_at` 校准（见 `references/mr-pr.md`「交付日校准」节）。整份汇报按交付日划分窗口。

## 选项

- `--days N`：汇总最近 N 天的交付（默认 `7`）
- `--authors name1,name2`：筛选提交作者，逗号分隔（默认当前 `git config user.name`，经别名表展开）
- `--mode lite|full`：汇报颗粒度（默认 `lite`）
- `--output <dir>`：输出文件夹（默认系统临时目录 `$TMPDIR/work-reports`；`$TMPDIR` 未设置时用 `/tmp`）

解析完成后向用户确认日期范围、作者列表、模式，并**询问是否需要查阅合并请求（MR/PR）**——需要才查，默认视为不需要。

## 1. 收集提交

日期范围：`--since` 为 N 天前，`--until` 为今天 + 1 天（含当天）。

**作者展开**：每个 `--authors` 主名查下方别名表，主名与全部变体各传一个 `--author` 参数（多参数 OR 语义，不用 `\|` 正则，避免名字含正则特殊字符时失效）。

| 主名 | 变体（name 或 email） |
| --- | --- |
| `TransonQ` | `Transon Quan`、`quanscheng@qq.com`、`transon.quan@litcompute.com` |

主名不在表中则仅用主名本身。

分两步收集：

1. 窗口内 merge commits：

```bash
git log --merges --since="<start-date>" --until="<end-date+1>" --format="%H %cd %s" --date=short
```

对每个 merge commit 记录其引入的 commits（挂到该 merge 日期）：

```bash
git log <merge>^1..<merge> --format="%h %cd %s" --date=short
```

2. 窗口内非 merge commits（直推与 FF 流的交付）：

```bash
git log --no-merges --since="<start-date>" --until="<end-date+1>" --format="%h %cd %s" --date=short
```

从中排除已被窗口内 merge commit 引入的 commits（避免重复归属）。

同时获取当前分支名：`git branch --show-current`。

**完成标准**：所有符合条件的 merge commits 与非 merge commits 已列出；每个 merge commit 的引入集合已记录；分支名与提交总数（排除 merge commit）已记录。

## 2. 查阅合并请求（可选）

按确认点用户答复分支：

- **需要查阅** → 加载 `references/mr-pr.md`，按其中流程执行
- **不需要 / 平台不可用** → 跳过本节，按纯 git 口径继续

**完成标准**：用户答复已明确；「需要」时 MR/PR 列表已拉取并尝试全部配对（细节见 `references/mr-pr.md` 完成标准）。

## 3. 归属交付日

- 被窗口内 merge commit 引入的 commits：交付日 = 该 merge commit 的日期。merge commit 自身不报内容，只提供日期挂载与分支名背景
- 其余窗口内 commits：交付日 = 自身提交日期
- 未合并分支的 commits 不在当前分支历史，天然排除（只算有效合并）
- 已查阅 MR/PR 时：交付日按 `references/mr-pr.md`「交付日校准」节处理，偏差 > 1 天条目交确认点裁决

**完成标准**：每条 commit 恰好归属一次，无重复无遗漏。

## 4. 分类提交

full 模式走大类映射，lite 模式走语义聚类定领域，分述如下。

### 4.1 full：大类映射

**大类**——从 conventional commit 前缀映射：

| 前缀 | 大类 |
| --- | --- |
| `feat` | 新功能开发 |
| `fix` | 问题修复 |
| `docs` | 文档与知识沉淀 |
| `refactor` | 代码重构与架构优化 |
| `perf` | 性能优化 |
| `style` | 基础设施与工程效能 |
| `chore` / `ci` / `deps` / `build` / `test` | 基础设施与工程效能 |

- `style` 是 conventional 语义（格式化、空格），不代表 UI；UI/UX 优化由 scope（如 `feat(ui)`）或标题关键词判定
- 无前缀提交：LLM 语义判断归入最相近大类，判断不出归「其他」

**聚合键**——按优先级：ticket ID（如 `#LIT-118`）> scope > 标题关键词。同一 ticket 的 commits 聚合成一节，不拆散。已查阅 MR/PR 时，ticket ID 提取来源见 `references/mr-pr.md`「数据利用」节。

**大类排序**：新功能开发 → 问题修复 → UI/UX 优化 → 代码重构与架构优化 → 性能优化 → 基础设施与工程效能 → 文档与知识沉淀 → 其他。

**完成标准**：每条 commit 有大类标签；同 ticket 的 commits 在同一节。

### 4.2 lite：语义聚类定领域

- 读全部已归属 commits，按**业务语义**聚类定领域：忽略 scope 字面（不同模型对同领域用词可能不同，`zy-home`/`home`/`homepage` 同组），免疫用词漂移
- 不建术语表、不落盘：每次运行现聚，聚类结果以确认点校正为准
- 无 scope / 无 type 的 commit：语义归入最相近领域，判断不出归「其他」

**lite 确认点**（唯一打断，一次过）：聚类后展示领域清单、组标题候选、分组归属、提交量；用户一次补正领域名、改错归、调排序；领域名提炼不出时在此询问。

**完成标准**：每条 commit 恰好归属一个领域；领域清单与归属经用户确认。

## 5. 生成汇报

根据 `--mode` 加载对应模板，按模板格式生成汇报，写入 `<output>/<end-date>-<mode>.md`（`--output` 指定，默认 `$TMPDIR/work-reports/`，目录不存在则创建）：

- lite 模式：参考 `templates/LITE.md` — 章节 = 领域（提交量降序），条目 = 业务点级合并概括（不逐 commit 罗列、不标日期），快速浏览
- full 模式：参考 `templates/FULL.md` — 按功能域分组，每节含背景和开发明细，叙述完整连贯。背景素材优先级见 `references/mr-pr.md`「数据利用」节（默认纯 git 口径：ticket 主线 → merge 分支名 → commit messages）

报告头注明交付日口径；已查阅 MR/PR 时头部列出 MR/PR 数，平台不可用则标注缺失原因。同日同 mode 重复运行覆盖原文件，视为修正重跑。

**完成标准**：输出文件已写入，所有已归属 commit 已纳入，格式完全匹配模板要求。

## 6. 输出

向用户报告文件路径。

## 边界

- 数据源基线为纯 git：无平台依赖，任何平台可用性不阻塞汇报生成
- MR/PR 增强层为可选：默认不查阅，用户确认需要才查；平台识别、降级链与 squash 还原细节见 `references/mr-pr.md`
