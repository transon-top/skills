---
name: work-report
argument-hint: '[--days N] [--authors name1,name2] [--mode simple|full]'
description: 从 git 提交历史整理工作汇报（日报/周报/月报），支持按天数、作者、颗粒度筛选。仅手动 `/work-report` 调用。
disable-model-invocation: true
---

# /work-report

从 git 提交历史整理工作汇报（日报/周报/月报）。纯 git 数据源，无平台 API 依赖。

**交付日口径**：工作归入其交付当天，而非提交当天——merge commit 流的交付日 = 合并日；直推/FF 流的交付日 = 提交日。整份汇报按交付日划分窗口。

## 选项

- `--days N`：汇总最近 N 天的交付（默认 `7`）
- `--authors name1,name2`：筛选提交作者，逗号分隔（默认当前 `git config user.name`，经别名表展开）
- `--mode simple|full`：汇报颗粒度（默认 `simple`）

解析完成后向用户确认日期范围、作者列表、模式，等待确认后再继续。

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

## 2. 归属交付日

- 被窗口内 merge commit 引入的 commits：交付日 = 该 merge commit 的日期。merge commit 自身不报内容，只提供日期挂载与分支名背景。
- 其余窗口内 commits：交付日 = 自身提交日期。
- 未合并分支的 commits 不在当前分支历史，天然排除（只算有效合并）。

**完成标准**：每条 commit 恰好归属一次，无重复无遗漏。

## 3. 分类提交

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

**聚合键**——按优先级：ticket ID（如 `#LIT-118`）> scope > 标题关键词。同一 ticket 的 commits 聚合成一节，不拆散。

**大类排序**：新功能开发 → 问题修复 → UI/UX 优化 → 代码重构与架构优化 → 性能优化 → 基础设施与工程效能 → 文档与知识沉淀 → 其他。

**完成标准**：每条 commit 有大类标签；同 ticket 的 commits 在同一节。

## 4. 生成汇报

根据 `--mode` 加载对应模板，按模板格式生成汇报，写入 `~/.claude/work-reports/<end-date>-<mode>.md`：

- simple 模式：参考 `templates/SIMPLE.md` — 按大类分组，`功能域: 一句话描述`，从项目视角阐述功能价值
- full 模式：参考 `templates/FULL.md` — 按功能域分组，每节含背景和开发明细，叙述完整连贯。背景素材优先级：ticket 主线 → merge 分支名（谁做的）→ commit messages

报告头注明交付日口径。同日同 mode 重复运行覆盖原文件，视为修正重跑。

**完成标准**：输出文件已写入，所有已归属 commit 已纳入，格式完全匹配模板要求。

## 5. 输出

向用户报告文件路径。

## 边界

- squash 流不在覆盖范围：粒度塌缩后无法从纯 git 还原。当前目标仓库（skills、aetherflow/frontend）均为 merge commit 或 FF 流，无此问题；遇到 squash 仓库时另行设计。
