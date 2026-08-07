# skills

提供日常开发工作流的自动化能力。目前包含四个技能：约定式提交、工作汇报、架构逆向工程和 multica 协作。

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

自动检测项目检查命令（lint、typecheck、format），分析当前分支变更，生成提交信息并直接执行提交。

**选项：**

| 选项           | 说明                           |
| -------------- | ------------------------------ |
| `--no-verify`  | 跳过预提交检查                 |
| `--style=full` | 生成含正文和页脚的完整提交信息 |
| `--type=feat`  | 强制指定提交类型               |

**示例：**

```text
> /commit

检查命令：未找到（项目无 lint/typecheck 脚本），跳过。
变更分析：skills/commit/SKILL.md（新增）
提交信息：✨ feat(commit): 添加约定式提交技能

[main abc1234] ✨ feat(commit): 添加约定式提交技能
```

### /arch-reverse-engineering — 架构逆向工程

对现有代码仓库进行系统性逆向分析，生成产品功能清单、用户故事地图和简历项目经历三份文档。

**基本用法：**

```bash
/arch-reverse-engineering [目标目录] [-o 输出路径]
```

默认分析当前工作目录，输出到 `docs/<project-name>/`。

**输出文件：**

| 文件 | 说明 |
| ------ | ------ |
| `feature-list.md` | 产品功能清单，含模块划分和功能点 |
| `user-stories.md` | 用户故事地图，按阶段排列 |
| `resume-entry.md` | 简历项目经历，含技术决策和面试 Q&A |

### /work-report — 工作汇报

从 git 提交历史生成日报、周报或月报。

**基本用法：**

```bash
/work-report
```

默认汇总最近 7 天、当前作者的提交。

**参数：**

| 参数                  | 默认值        | 说明                              |
| --------------------- | ------------- | --------------------------------- |
| `--days 1`            | `7`           | 汇总最近 N 天                     |
| `--authors 张三,李四` | 当前 git user | 筛选作者                          |
| `--mode full`         | `simple`      | full = 详细汇报，含背景和开发明细 |

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

### /multica-flow — multica 平台人工总控编排

multica 平台的编排技能：磨需求 → 指派 multica agent → 拷问交付，把"本地磨想法"和"multica 分派执行"接成一个闭环。底层平台操作复用 `multica-*` skills，本技能只做编排，不重复平台契约。

**触发入口：**

```bash
/multica-flow <issue-id>      # 打开已有 issue，拷问交付；需求模糊则先重磨
/multica-flow 新任务 <主题>    # 从空查起，走磨 → 派流程
```

**工作流：**

1. **磨需求**：按 grilling 模式追问，磨出任务目标、范围边界（含明确不做的事）、可验证的验收标准
2. **审定义**：验收标准可验证？范围无歧义？不够格就继续磨
3. **指派**：`multica issue create/update` 写入 spec，`@mention` 触发 agent 执行
4. **拷问交付**：拉 PR 到本地，对照 issue 逐条过验收标准、跑测试，疑问写成 comment 发回 agent

依赖 `grilling` 与 `multica-*` skills。

## 项目结构

```text
skills/
├── commit/                  # 约定式提交技能
│   ├── SKILL.md
│   └── references/          # 检查命令发现策略
├── work-report/             # 工作汇报技能
│   ├── SKILL.md
│   └── templates/           # 汇报模板
│       ├── simple.md
│       └── full.md
├── arch-reverse-engineering/  # 架构逆向工程技能
│   ├── SKILL.md
│   └── templates/             # 输出模板
│       ├── FEATURE_LIST.md
│       ├── USER_STORIES.md
│       └── RESUME_ENTRY.md
└── multica-flow/              # 人工总控工作流技能
    └── SKILL.md
```
