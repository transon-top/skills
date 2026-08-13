# 合并请求（MR/PR）模板

> 开合并请求时按本模板编写标题与描述，保证每次格式一致。
> 本文「合并请求」为通用称谓——GitHub 称 PR、GitLab 称 MR，全篇统一用「合并请求」。

## 标题

格式：`[TYPE] 简短描述`

- `TYPE` 九选一：`FEATURE`、`BUGFIX`、`REFACTOR`、`PERF`、`TEST`、`DOCS`、`CHORE`、`BUILD`、`CI`
- 简短描述：可观察变化的祈使式短句，不携带 issue key
- 聚焦单一目标，关联对应 Multica Issue

示例：

```text
[FEATURE] 支持控制台按租户过滤运行列表
[BUGFIX] 修复登录后 header 空白闪烁
```

## 描述

按下列章节顺序编写，章节标题固定不改写：

```markdown
## 关联 Issue
- [<identifier> <issue title>](<url>)
- Closes <identifier>

## 修改内容
- 做了什么、为什么做

## 技术方案与影响范围
- 关键方案、受影响模块、共享契约与兼容/迁移策略

## 验证结果
- `实际执行的命令` — PASSED / FAILED / NOT RUN（原因）

## 风险与回滚
- 风险等级：Low / Medium / High
- 已知风险、监控点和回滚/前向修复方式
```

### 填写规则

- **关联 Issue**：格式 `[<identifier> <title>](<url>)`，可多行。issue 的 web url 形如：

  ```text
  <app_url>/<workspace_slug>/issues/<identifier>
  ```

  其中 `app_url` 取 `multica config show`，`workspace_slug` 取 `multica workspace list` 的 SLUG 列。示例：`[LIT-154 支持租户过滤](http://81.69.16.59:32202/litcompute/issues/LIT-154)`
- **验证结果**：每条命令标注 `PASSED` / `FAILED` / `NOT RUN`，`NOT RUN` 必须附原因。命令清单以目标仓库契约与门禁为准，不得伪报未运行的检查
- **风险与回滚**：风险等级取 `Low` / `Medium` / `High` 之一；无已知风险也要写明「无」并给出等级

## 关闭 issue（close intent）

- 关闭契约（关键字全集、邻接规则、branch 排除、reference_only、一 issue 多合并请求分交付写法）：开合并请求前加载 `multica-working-on-issues` 获取，本模板不转述
- 本 skill 固定约定：`Closes <identifier>` 独立一行放「关联 Issue」节末行，关键字与 key 紧邻、中间不插词；只写实际存在的标识，不伪造编号
- 时机：close intent 只在 merge 事件时生效一次，合并后补写无效
