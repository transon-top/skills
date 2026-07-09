---
name: work-report
argument-hint: '[--days N] [--authors name1,name2] [--mode simple|full]'
description: 从 git 提交历史整理工作汇报（日报/周报/月报），支持按天数、作者、颗粒度筛选。仅手动 `/work-report` 调用。
disable-model-invocation: true
---

# /work-report

从 git 提交历史整理工作汇报（日报/周报/月报）。

## 选项

- `--days N`：汇总最近 N 天的提交（默认 `7`）
- `--authors name1,name2`：筛选提交作者，逗号分隔（默认当前 `git config user.name`）
- `--mode simple|full`：汇报颗粒度（默认 `simple`）

解析完成后向用户确认日期范围、作者列表、模式，等待确认后再继续。

## 1. 收集提交

执行 `git log` 收集提交：

```bash
git log --since="<start-date>" --until="<end-date+1>" --author="<author1>\|<author2>" --format="%h %ad %s" --date=short
```

- 日期范围：`--since` 为 N 天前，`--until` 为今天 + 1 天（含当天）
- 多个作者用 `\|` 分隔
- 同时获取当前分支名：`git branch --show-current`
- 统计提交数（排除 merge 提交）

**完成标准**：所有符合条件的提交已列出，分支名和提交总数已记录。

## 2. 分类提交

逐条提交分配两个标签：

**大类** — 从 conventional commit 前缀映射：

| 前缀 | 大类 |
| ------ | ------ |
| `feat` | 新功能开发 |
| `fix` | 问题修复 |
| `style` | UI/UX 优化 |
| `refactor` | 代码重构与架构优化 |
| `perf` | 性能优化 |
| `chore` / `ci` / `deps` / `build` / `test` / `docs` | 基础设施与工程效能 |

**功能域** — 从 scope 提取（如 `(usage)` → 用量统计，`(pricing)` → 计费）。无 scope 的提交根据标题关键词归入最相近的功能域。

- Merge 提交忽略

**完成标准**：每条非 merge 提交都有大类标签和功能域归属。

## 3. 生成汇报

根据 `--mode` 加载对应模板，按模板格式生成汇报，写入 `/tmp/work-report-<end-date>.md`。

- simple 模式：参考 `templates/SIMPLE.md` — 按大类分组，`功能域: 一句话描述`，从项目视角阐述功能价值
- full 模式：参考 `templates/FULL.md` — 按功能域分组，每节含背景和开发明细，叙述完整连贯

**完成标准**：输出文件已写入，所有提交已纳入汇报，格式完全匹配模板要求。

## 4. 输出

向用户报告文件路径。
