# mermaid-diagrams 测试

四层,从「脚本能不能跑」到「文档真不真管用」逐层加成本。测试框架零依赖,只用 Node 自带 `node:test`。

前置:渲染器依赖 `beautiful-mermaid`,先装一次——`cd skills/mermaid-diagrams/tools && npm install`。

```sh
node --test "tests/mermaid/*.test.mjs" "tests/mermaid/eval/*.test.mjs"   # 层 1 + 2(秒级,无副作用)
node tests/mermaid/eval/run.mjs --dry-run                                # 层 3:先看会跑什么
node tests/mermaid/eval/run.mjs S3-长流程拆图                             # 层 3:真跑一条(要 claude CLI)
```

## 层 1 · CLI 合约(`cli.test.mjs`)

跑 `skills/mermaid-diagrams/tools/render-diagrams.mjs`,断言:

- 三种输入 × 两种格式:目录批量、单文件、stdin;`--format svg|ascii`
- 扩展名随格式切换(`.svg` / `.txt`),文本图落盘无 ANSI 色码、结尾有换行
- 参数面:默认 svg、`--format=` 与 `--format` 带空格两种写法等价、未知格式 / 缺值 / 拼错主题名 / 路径不存在 / 非法 mermaid 头各自退出码与提示
- 自包含:SVG 无 Google Fonts、无 `@import`、无外链、无脚本;长标签不被截断成省略号
- `--preview`:预览页落进隔离的 TMPDIR;浏览器用 `open` / `xdg-open` 桩替换,只记录调用不真弹窗
- 回归钉子:12 节点图仍出一份且标签全在(不设节点上限)

沙箱细节在 `lib/harness.mjs`:每次调用一个临时目录,产物、预览页、浏览器调用记录都在里面。

## 层 2 · 文档契约(`doc.test.mjs`)

SKILL.md 与脚本互相对账,任一侧单改就红:

- 描述里的索引词 = 正文方法论的条目名;拆图那条必须写「总览 + 展开」「同名」,且不得回退到「心智模型」
- 全篇无「节点上限」
- 正文列的六种图类型各有夹具
- 文档写到的 flag 集合 = 脚本 USAGE 里的 flag 集合;默认格式、默认主题、预览文件名三方一致

## 层 2b · 跨文件副本(`doc-sync.test.mjs`)

同一规则只应有一处定义。仓库里任何技能文档再抄一份「节点上限」,这里点名报出 `文件:行号`。

## 层 3 · 行为 eval(`eval/`)

| 文件 | 作用 |
| -- | -- |
| `scenarios.json` | 七条场景:默认格式、纯文本、长流程拆图、lite 单图、长标签、主题统一、中文标签选格式。每条挂一条 SKILL.md 规则 |
| `run.mjs` | 每条场景开干净目录,`claude -p` 带技能跑一遍,转述落盘,再让判定器打分 |
| `check-artifacts.mjs` | 不调模型的结构判定器:图组编号、子图首节点与总览同名、各子图展开不同节点、总览是骨架、标签无省略号、产物齐全;`--require-expansion`(full)/ `--no-expansion`(lite)选判定口径 |
| `check-artifacts.test.mjs` | 判定器自己的正反例自测——防止它松到全过 |

`check-artifacts.mjs` 也能单用,审人或 agent 画的图组:

```sh
node tests/mermaid/eval/check-artifacts.mjs <产物目录> --require-expansion --expect-ext .svg
```

图组约定:`<名>-1.mmd` 是总览,`-2` / `-3` 是子图,编号连续。节点抽取是启发式(识别 flowchart / state / class / sequence / er 的常见写法),看不懂的形状会漏节点——它判的是结构,不是渲染质量。
