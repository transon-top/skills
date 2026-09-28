---
name: mermaid-diagrams
description: 将 Mermaid 图源(.mmd)渲染为离线自包含 SVG(目录批量 / 单文件 / stdin 三种模式),并附通用图解方法论——图类型选择、节点上限与拆图组、节点命名、主题统一。当用户要画或渲染 mermaid 图、流程图、时序图、类图、状态图、ER 图、架构图时使用。
---

# Mermaid Diagrams

把 Mermaid 图源(`.mmd`)渲染为**离线自包含 SVG**——零 CDN、剥外部字体引用、浏览器直接打开。附一套经课程生产验证的图解实践,默认值可按场景调整。

## 渲染脚本(技能自带)

首次使用在本技能目录执行(`beautiful-mermaid` 是唯一依赖):

```sh
cd tools && npm install
node tools/render-diagrams.mjs <srcDir> [outDir] [theme]    # 目录批量:*.mmd -> *.svg
node tools/render-diagrams.mjs <file.mmd> [out.svg] [theme] # 单文件
node tools/render-diagrams.mjs - [theme]                    # stdin -> stdout
```

- 主题默认 `github-light`;15 款可选键与选型建议见 `references/themes.md`
- 任意模式加 `--preview`:额外生成 `<tmpdir>/mermaid-preview.html`(SVG 内嵌,目录模式多图合并一页)并调用系统浏览器打开,供快速预览
- 输出是独立 SVG 文件;要内嵌 HTML,把 SVG 内容整段拷进 HTML 即可(自包含,不引外部资源)

## 图解方法论(默认值,可按场景调整)

1. **图类型选择**:flowchart(流程 / 分层 / 依赖)、class(模块 / 类型关系)、sequence(调用链 / 交互)、state(状态机)、ER(实体关系)、xychart(数值)六种足够;超出(时间线 / 甘特 / 思维导图 / C4)改用 mermaid-cli 预渲染
2. **节点上限默认 6**:每张图最多 6 个主要元素(flowchart 计方框、sequence 计参与者、class 计类、ER 计实体、state 计状态)。超限拆成 2~3 张姊妹子图,图名加 `-1`/`-2` 后缀,相邻排放。大图渲染慢、视线扫不到,小图逐张读更清晰
3. **节点命名**:只放一个完整短语,代码原名 + 小字职能注解(如 `AgentLoop · 主循环`);**省略号禁用**——beautiful-mermaid 不截断长文本,标签原样撑大节点、挤爆布局。放不下完整文案时,节点写"概括词 + 序号",图下方放注解列表按序号展开全文
4. **主题统一**:一个文档 / 项目一款主题到底,风格一致优先于单张好看
5. **自包含**:渲染器已剥 Google Fonts `@import`;别手工加 CDN `<script>` / `<link>`
6. **ASCII 降级(可选)**:需要纯文本 / 终端阅读时,beautiful-mermaid 的 `renderMermaidASCII` 可渲染 ASCII 版
7. **图组**:多图时第 1 张是总览(画整体心智模型),其余子图按读数顺序拆解;每张子图的第一个节点必须在总览图中找得到(同词同名,读者知道"从哪进")

## 输入与输出

- 图源 `.mmd` 与成品 `.svg` 分目录存放,源可再生成
- 校验:渲染后浏览器直接打开 SVG,确认渲染完整、文本未被截断
