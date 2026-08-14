# 修复留档

> 平行场景：本地修复已完成、不派执行，落任务平台+代码仓库双向留档。进入：意图直入（留档 / 补记录 / 本地已修完 / 开 MR 留档），回显确认后走本节点。出口：「合并收口」。

## 提交推送分支

- main 切出隔离分支，只提交本次修复相关文件；分支名不带 issue key（issue 尚未建），按仓库命名风格（如 `fix/frontend/<短横线描述>`）
- 提交说明按仓库既有风格：正文写明根因与验证结果
- 不直接推 main

## 开合并请求

- 标题符合仓库类型约定（`[TYPE] 简短描述`）
- 描述按固定章节：「关联 Issue（暂空，建 issue 后回补）/ 修改内容 / 技术方案与影响范围 / 验证结果 / 风险与回滚」
- 「验证结果」每条命令标注 `PASSED` / `FAILED` / `NOT RUN`（未运行附原因）

## 建留档 issue

- `multica issue create --title <一句话> --description-file <spec> --profile <name>`——`todo`、不指派
- spec 按 `templates/task-spec.template.md` 留档场景填：描述开头醒目标注「留档、不派执行」；「交付要求」写已完成、不派执行，含合并请求链接与状态
- 平台侧内容面向他人：不含本机绝对路径，仓库位置写远端地址加相对目录

## 回补合并请求

- 描述「关联 Issue」节补 `[<identifier> <title>](<url>)` + 节末独立行 `Closes <identifier>`（合并后 issue 自动 done）
- 留档 issue 与合并请求双向关联至此闭合

完成：分支已推、合并请求已开、留档 issue 已建（todo 不指派、含合并请求信息）、合并请求描述含关联与 Closes；出口「合并收口」
