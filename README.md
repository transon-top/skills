# skills

提供日常开发工作流的自动化能力，目前包含五个技能。

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

## 技能列表

| 技能 | 说明 |
| ---- | ---- |
| [`/commit`](skills/commit/SKILL.md) | 约定式提交：分析变更，生成 Conventional Commits 规范提交信息 |
| [`/work-report`](skills/work-report/SKILL.md) | 工作汇报：从 git 提交历史生成日报、周报或月报 |
| [`/arch-reverse-engineering`](skills/arch-reverse-engineering/SKILL.md) | 架构逆向工程：系统性分析代码库，生成功能清单、用户故事地图和简历项目经历 |
| [`/multica-flow`](skills/multica-flow/SKILL.md) | multica 平台人工总控编排：打磨需求 → 指派 agent 执行 → 审查交付、返工闭环 |
| [`/frontend-test-setup`](skills/frontend-test-setup/SKILL.md) | 前端测试体系：配置 Vitest / Playwright，确立 code / user behavior 边界，注入 CLAUDE.md 或 AGENTS.md |
| [`/anatomy-course`](skills/anatomy-course/SKILL.md) | 图解课程：从一个仓库生成"宏观思维模型"图解课程，整体图解 → 拆分讲解结构/关系/作用，产出自学 HTML 课程 |
