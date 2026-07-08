---
name: work-report
description: 从 git 提交历史整理工作汇报（日报/周报/月报），支持按天数、作者、颗粒度筛选。仅手动 `/work-report` 调用。
disable-model-invocation: true
---

# 工作汇报生成

从 git 提交历史整理工作汇报（日报/周报/月报）。三个参数，均通过 args 字符串传入，空格分隔：

| 参数 | 格式 | 默认值 | 说明 |
|------|------|--------|------|
| `--days N` | 整数 | `7` | 汇总最近 N 天的提交 |
| `--authors name1,name2` | 逗号分隔 | 当前 git user.name | 筛选提交作者 |
| `--mode simple\|full` | 枚举 | `simple` | 汇报颗粒度 |

参数解析规则：
- 缺省参数使用默认值
- `--authors` 未传时，用 `git config user.name` 作为默认作者
- 解析完成后向用户确认：日期范围、作者列表、模式，等待确认后再继续

## 1. 收集提交

执行 `git log` 收集提交：

```
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
|------|------|
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

- simple 模式：参考 `templates/simple.md` — 按大类分组，`功能域: 一句话描述`，从项目视角阐述功能价值
- full 模式：参考 `templates/full.md` — 按功能域分组，每节含背景和开发明细，叙述完整连贯

**完成标准**：输出文件已写入，所有提交已纳入汇报，格式完全匹配模板要求。

## 4. 输出

向用户报告文件路径。
