# TransonTop Skills

Claude Code 技能包，提供日常开发工作流的自动化能力。目前包含两个技能：约定式提交和工作汇报。

## 安装

**推荐方式：** 通过 npm registry 一键安装（全局）：

```bash
npx skills add transon-top/skills -g
```

**手动安装：** 将 `skills/` 目录复制到 Claude Code 的技能目录：

```bash
# 用户级（所有项目可用）
cp -r skills/* ~/.claude/skills/

# 项目级（仅当前项目可用）
cp -r skills/* .claude/skills/
```

重启 Claude Code 或刷新技能列表即可使用。

## 技能

### /commit — 约定式提交

分析代码变更，生成符合 Conventional Commits 规范的提交信息。

**基本用法：**

```bash
/commit
```

自动检测项目检查命令（lint、typecheck、format），分析当前分支变更，生成提交信息并等你确认。

**选项：**

| 选项 | 说明 |
|------|------|
| `--no-verify` | 跳过预提交检查 |
| `--style=full` | 生成含正文和页脚的完整提交信息 |
| `--type=feat` | 强制指定提交类型 |

**示例：**

```
> /commit

检查命令：未找到（项目无 lint/typecheck 脚本），跳过。
变更分析：skills/commit/SKILL.md（新增）
提交信息：✨ feat(commit): 添加约定式提交技能
确认执行？ok

[main abc1234] ✨ feat(commit): 添加约定式提交技能
```

### /work-report — 工作汇报

从 git 提交历史生成日报、周报或月报。

**基本用法：**

```bash
/work-report
```

默认汇总最近 7 天、当前作者的提交。

**参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--days 1` | `7` | 汇总最近 N 天 |
| `--authors 张三,李四` | 当前 git user | 筛选作者 |
| `--mode full` | `simple` | full = 详细汇报，含背景和开发明细 |

**示例：**

```bash
# 今天的日报
/work-report --days 1

# 本周周报，详细模式
/work-report --days 7 --mode full

# 指定作者的月报
/work-report --days 30 --authors 张三
```

汇报输出为 Markdown 文件，保存在 `/tmp/work-report-<日期>.md`。

## 项目结构

```
skills/
├── commit/                  # 约定式提交技能
│   └── SKILL.md
└── work-report/             # 工作汇报技能
    ├── SKILL.md
    └── templates/           # 汇报模板
        ├── simple.md
        └── full.md
```
