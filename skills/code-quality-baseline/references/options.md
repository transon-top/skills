# 选项与陷阱

主文件只放基线配置；这里是改配置时要查的事实。

## ESLint 规则默认值

| 规则 | 默认 | 说明 |
| ---- | ---- | ---- |
| `complexity` | max 20 | `variant: "modified"` 让每个 `switch` 只算 1 |
| `sonarjs/cognitive-complexity` | 15 | 与圈复杂度互补，两个都留 |
| `max-lines-per-function` | 50 | `skipBlankLines` / `skipComments` 默认 false |
| `max-depth` | 4 | 块嵌套深度 |
| `max-params` | 3 | `countThis` 控制 TS 的 `this` 参数是否计数 |
| `@typescript-eslint/no-unused-vars` | error | recommended 已启用；开启时要确认基础规则 `no-unused-vars` 已关 |

- `tseslint.configs.recommended` 是**数组**，必须展开；`base` / `eslintRecommended` / `disableTypeChecked` 才是单对象
- sonarjs 只有 `recommended` 与 `recommended-legacy`，flat config 用前者
- 配置里用 `max`，`maximum` 已废弃

## jscpd

| 键 | 默认 | 含义 |
| -- | ---- | ---- |
| `path` | `[]` | 扫描路径 |
| `minTokens` / `minLines` | `50` / `5` | 克隆块下限 |
| `ignore` | `[]` | 文件级 glob |
| `ignorePattern` | `[]` | 代码级正则，命中的 token 被跳过 |
| `threshold` | 无 | 重复率上限，超过 exit 1；不设只报告 |
| `exitCode` | 无 | 发现克隆时的退出码；不配不阻断 |
| `failOnEmpty` | `false` | 扫到 0 个文件时 exit 1 |

**退出码**：`0` 扫描完成且无闸门触发；`1` 超 `threshold`、`--fail-on-new-clones`、`--fail-on-empty`、路径或格式错误；`N` 显式 `--exit-code N` 且有克隆；`2` 命令行解析错误。

陷阱：

- 配置按 `--config` → `.jscpd.json` → `package.json#jscpd` 发现，只在当前工作目录，不向上遍历
- 键拼错只丢那一个字段，其余照常生效；报错一闪而过
- `--ignore`（文件 glob）与 `--ignore-pattern`（代码正则）是两个选项；正则含逗号时放进配置文件
- `format` 里 `typescript` 与 `tsx` 分开；JS 项目再加 `javascript` / `jsx`
- `threshold` 的 exit 1 不受 `exitCode` 影响；纯报告就别设 `threshold`

### semantic（实验性）

```json
{
  "semantic": {
    "enabled": true,
    "scope": "all",
    "threshold": 0.4125,
    "sameThreshold": 0.6375
  }
}
```

默认模型 CodeRankEmbed，跨语言 / 同语言阈值默认 0.4125 / 0.6375。首次用 `jscpd --semantic-download` 下载模型（548 MB）；CPU 推理，向量有缓存。它会报出"相关但不重复"的代码，合并前人工看。

## knip

| 键 | 含义 |
| -- | ---- |
| `entry` / `project` | 入口 / 分析范围 |
| `ignore` | 任意 issue 类型都排除的文件 |
| `ignoreIssues` | 按 issue 类型排除，如 `{ "src/generated/**": ["exports"] }` |
| `ignoreDependencies` | 包名或正则 |
| `ignoreExportsUsedInFile` | 布尔，或 `{ "interface": true, "type": true }` 按符号类型 |
| `rules` | 各 issue 类型设 `"error"` / `"warn"` / `"off"` |

陷阱：

- 配置顶层有副作用（动态 import 重依赖、`await` 连接）时，配置加载失败会 exit 2；`--no-exit-code` 不覆盖这一分支
- `--fix --exports` 会批量删导出；基线未立时先别跑
