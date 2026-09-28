---
name: mermaid-diagrams
argument-hint: '[--mode lite|full] [--format svg|ascii] [图源路径 / 要画的内容]'
description: 把 Mermaid 图源(.mmd)渲染为离线自包含 SVG,或渲染为终端 / 纯文本可读的文本图(ascii 输出格式)。附通用图解方法论——绘制模式(lite / full)、图类型选择、拆图(总览 + 展开)、节点命名、主题统一。当用户要画或渲染 mermaid 图、流程图、时序图、类图、状态图、ER 图、架构图,或要把图放进终端 / 纯文本时使用。
---

# Mermaid Diagrams

把 Mermaid 图源(`.mmd`)渲染为**离线自包含 SVG**——零 CDN、剥外部字体引用、浏览器直接打开;要在终端 / 纯文本里读图时,换 `--format ascii` 出文本图。附一套经课程生产验证的图解实践,默认值可按场景调整。

## 渲染脚本(技能自带)

首次使用在本技能目录执行(`beautiful-mermaid` 是唯一依赖):

```sh
cd tools && npm install
node tools/render-diagrams.mjs <srcDir> [outDir] [theme]     # 目录批量:*.mmd -> *.svg
node tools/render-diagrams.mjs <file.mmd> [out.svg] [theme]  # 单文件
node tools/render-diagrams.mjs - [theme]                     # stdin -> stdout
```

- **输出格式** `--format svg|ascii`,默认 `svg`。`ascii` 出 Unicode 制表符画框的文本图,扩展名 `.txt`,贴进终端、Markdown 代码块、纯文本渠道;用户要在终端 / 纯文本里读图时选它。**标签含中文就出 `svg`**——ascii 按半角计宽,中文标签的框线错位;必须出文本图时,节点只放 ASCII 概括词或序号,中文释义放图下注解列表
- **主题** 默认 `github-light`,两种输出格式通用;15 款可选键与选型建议见 `references/themes.md`
- **预览** 任意输入方式加 `--preview`:生成 `<tmpdir>/mermaid-preview.html`(目录模式多图合并一页)并调用系统浏览器打开
- **成品自包含**:SVG 可直接内嵌 HTML,文本图可直接粘贴;渲染器已剥 Google Fonts `@import`,别手工加 CDN `<script>` / `<link>`

## 图解方法论(默认值,可按场景调整)

1. **绘制模式**:`lite` 或 `full`,**动手画之前先问用户**,并按主题复杂度推荐一个(推荐项排第一并标注)。**lite** 一张图简洁讲完——主题是一条主线、一眼扫得完时给这个;用户只要速览、不要细节时也给这个。**full** 出总览 + 展开的多图组——主线不止一条、有层级或阶段、一张图一眼扫不完时给这个。调用时带了 `--mode lite|full`,或对话里已经说了要哪种,就直接照办,不再问
2. **图类型选择**:flowchart(流程 / 分层 / 依赖)、class(模块 / 类型关系)、sequence(调用链 / 交互)、state(状态机)、ER(实体关系)、xychart(数值)六种足够;超出(时间线 / 甘特 / 思维导图 / C4)改用 mermaid-cli 预渲染
3. **拆图:总览 + 展开**(full 模式):拆成 2~3 张姊妹子图,图名加 `-1`/`-2` 后缀,相邻排放。第 1 张是**总览**,只画整体脉络(如 `AA -> BB -> CC`),不展开细节;后续每张子图展开总览里的**一个**节点——子图第一个节点就是被展开的那个节点,同名(如展开 `AA` 的子图从 `AA` 起笔:`AA -> aa -> cc -> oo`)。读者在总览里选节点、进子图看细节。拆不拆、拆几个,看主线分量,不看节点个数
4. **节点命名**:只放一个完整短语,代码原名 + 小字职能注解(如 `AgentLoop · 主循环`);**省略号禁用**——beautiful-mermaid 不截断长文本,标签原样撑大节点、挤爆布局。放不下完整文案时,节点写"概括词 + 序号",图下方放注解列表按序号展开全文
5. **主题统一**:一个文档 / 项目一款主题到底,风格一致优先于单张好看

## 输入与输出

- 图源 `.mmd` 与成品分目录存放,源可再生成
- 校验:打开成品看一眼——SVG 确认渲染完整、文本未被截断;文本图确认框线对齐
