# jscpd

复制粘贴检测。文章用它找"AI 又写了一份实现而不是复用已有的"。

v5 是 Rust 重写，自包含二进制，不依赖 Node 运行时；对 v4 是 drop-in CLI replacement，命令用法不变。

## 安装

```bash
pnpm add -D jscpd
```

包名 `jscpd`，装出 `jscpd` 命令；另有 `cpd` 包装出同名短命令，**同一个二进制**。

## 配置文件

文件名 **`.jscpd.json`**（`-c/--config <path>` 可指定）。发现顺序：

```text
--config <path> → .jscpd.json → .config/jscpd.json → package.json 的 jscpd 键
```

两个实测事实：

- **只在当前工作目录查找，不向上遍历父目录**
- 只认 `.jscpd.json` 体系。`.cpd.yaml` 不被识别（尽管某处 fixture 文档提到过）

### 命名风格：camelCase

**必须 camelCase。** snake_case 的键会被逐条报 `unknown field` 并忽略。

**三个坑（文档没写清，实测得出）：**

1. **类型错误会让整个配置文件被静默丢弃**，回退到全默认值。未知键只是警告、其他值仍生效；但类型错了是整份作废——写错一个键的类型，可能让所有配置失效而表面上还在跑
2. **`failOnNewClones` 是数字不是布尔**（`0` = 零容忍，`3` = 允许 3 个新克隆）
3. **`skipComments` 键在 v5 不存在**，只有 CLI 上的 `--skip-comments`（且只是 `--mode weak` 的别名）。配置里用 `"mode": "weak"`

## 关键配置项

| 键 | 默认值 | 含义 |
| -- | ------ | ---- |
| `path` | `[]` | 扫描路径数组 |
| `minTokens` | `50` | 克隆最小 token 数 |
| `minLines` | `5` | 克隆最小行数 |
| `maxLines` | `null` | 单个重复块最大行数 |
| `maxSize` | `1mb` | 跳过大于此值的文件 |
| `mode` | `"mild"` | `mild` / `weak` / `strict` |
| `format` | `[]`（全部） | 限定格式数组 |
| `ignore` | `[]` | **文件级 glob** 忽略 |
| `ignorePattern` | `[]` | **代码级正则**，匹配到的 token 被跳过 |
| `reporters` | `["console"]` | console、console-full、json、html、sarif、ai、badge、xml、csv、markdown、codeclimate、openmetrics、xcode、threshold、silent |
| `output` | `"report"` | 文件类 reporter 的输出目录 |
| `threshold` | `null` | **最大重复百分比**，超过则 exit 1 |
| `exitCode` | `null`（默认 1） | 只要发现 clone 就以此码退出 |
| `baseline` | `null` | 基线文件路径 |
| `failOnNewClones` | `null` | **数字**；超过 N 个新克隆则 exit 1（需 `baseline`） |
| `baselineFromRef` | `null` | 用 git ref 的树做临时基线（如 `origin/main`） |

`--ignore`（文件 glob）与 `--ignore-pattern`（代码正则）是**两个不同选项**。npm README 的选项表把它们混为一谈，以 `--help` 为准。CLI 上的 `--ignore-pattern` 会按逗号切分，正则里含逗号（`{1,3}`、`[,;]`）必须放进配置文件。

### `ignore` 里必须有的几类

只报告不阻塞的话，`ignore` 的取舍决定了第一份报告有没有人看。三类先排除：

- **构建产物与依赖**：`**/node_modules/**`、`**/.next/**`、`**/dist/**`、框架的输出目录
- **生成文件**：`**/*.d.ts`、类型生成物、`DO NOT MODIFY` 的脚手架。这些地方的重复**人工修不了**，下次生成还会回来
- **测试夹具**：故意包含重复或违规内容的夹具

第二类最容易漏，也最容易误判成真问题。**框架生成的文件同源同模板，互相重复是结构必然**，而它们人工改不了、下次生成还会回来。看报告里克隆的**两端路径**：都在生成目录内，加 `ignore`；一端是生成、一端是手写，那才可能是真信号。

## markup 与 logic 用不同阈值

文章要求"The important configuration is to use different thresholds for markup and logic"，理由是重复的 JSX 可能是有意的，重复的业务逻辑更可能是维护问题。

**jscpd 没有 per-format 阈值**——`threshold` 是单一全局百分比。实现方式只能是**跑两次**：

```bash
# logic：严格
pnpm exec jscpd . --format javascript,typescript --threshold 3 --ignore "**/*.test.ts"

# markup：宽松
pnpm exec jscpd . --format markdown,html,css --threshold 15
```

> 这个"跑两次"的方案由本技能构造，不是 jscpd 官方文档的写法。官方文档里出现的 "per-format" 只指统计，与阈值无关。

两条命令在 `package.json` 里各占一个 script，或合成一条 `&&` 串联。

## 退出码

| 码 | 触发条件 |
| -- | -------- |
| 0 | 扫描跑完且没有 gate 触发——**即使发现了克隆也是 0** |
| 1 | `--threshold` 超限、`--fail-on-new-clones` 超限、`--fail-on-empty` 且没扫到文件、reporter 写失败、扫描路径不存在、格式不支持、参数非法 |
| N | `--exit-code N`（默认 1），当至少发现一个克隆 |
| 2 | 命令行解析错误 |

**扫描 0 个文件时仍 exit 0**，只打印 `Warning: jscpd analyzed no files`。要让空结果也报错需加 `--fail-on-empty`。

这条对"检查显示绿灯其实没跑"的场景很关键——本技能的验证步骤要确认扫描到的文件数非 0。

基线门禁（`baseline`、`failOnNewClones`、`baselineFromRef`）与 CI 接线在工具里有，但**把检查变成不可跳过的门禁不在本技能范围内**——先用 `warn` 级报告跑一段时间，确认无误报再谈。

## 验证

```bash
pnpm exec jscpd . --reporters console,silent
```

确认：报告里**分析的文件数非 0**（这是最容易假绿的地方）、克隆计数是真实数字、配置已生效（改一个 `minTokens` 看计数是否变化）。

## 局限

只找**文本级**重复。两份分别写出来、规则相同但看着完全不同的实现看不见。语义重复仍需人工 review。

## 出处

要点 9 的推荐工具。配置键、默认值、退出码取自官方仓库 `docs/rust.md`。

实测自 `jscpd@5.2.0`（2026-09，二进制 `--help` 与夹具实跑）。
