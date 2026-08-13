## Comment 模板（人类侧）

> `<>` = 待替换占位符（替换后不留尖括号）
> 触发类 comment 必须**自包含**——agent 忙时会被折叠进运行中任务（coalesced/deferred），agent 可能只看到这条 comment + issue 历史。
> agent final comment 由 `multica-working-on-issues` 契约约束（变更清单/验证/PR URL），此处不定义。

## 质疑发回（验收不过时）

每条疑问一条 comment，三段缺一不可：标准/声称 → 现状 → 行动。

```markdown
## 疑问：<验收标准 N / 声称 X>

- 标准 / 声称：<原文引用>
- 现状：<证据——命令输出 / PR 状态>
- 行动：<指令，含期望结果>

[@agent](mention://agent/<uuid>)
```

## 指派触发（spec 更新后）

只写变更点，不重述全文——spec 本体在 issue description。

```markdown
## 更新 spec 

- 变更：<改动点>
- 按最新 spec 重新执行

[@agent](mention://agent/<uuid>)
```
