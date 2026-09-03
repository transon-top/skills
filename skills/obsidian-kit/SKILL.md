---
name: obsidian-kit
argument-hint: '[add [vault=<名称>] <内容> | config]'
description: Obsidian 捕获: 将内容整理为项目无关的经验卡或资源卡 (纯 URL), 写入已绑定 vault 的 inbox
disable-model-invocation: true
---

# /obsidian-kit

把内容 (碎片/经验/代码片段/URL) 捕获到已绑定的 Obsidian vault。技能只绑定一个 vault, 所有捕获默认落入它的 inbox。

## 前提

`obsidian` 命令行必须已安装且可达 (`command -v obsidian`)。`config.mjs check` 会校验 CLI 可达性, 不可达时失败停止, 先安装再继续。

## 配置

`~/.claude/.obsidian-kit.json`, 由本技能自带脚本管理 (路径相对本技能目录):

```bash
node scripts/config.mjs check    # 校验: JSON/三字段/root/obsidian CLI 可达/注册状态; inbox 缺失自动创建
node scripts/config.mjs get      # 输出当前配置 JSON
node scripts/config.mjs set --vault <名称> [--inbox <目录>] [--root <路径>]  # 绑定/换绑
```

- `vault`: vault 名称, `root`: vault 绝对路径, `inbox`: 捕获目标文件夹 (默认 `10_inbox`)
- `set` 取 root: 先试 obsidian CLI, 取不到时读 obsidian.json 配置, 均失败须用 `--root` 手动指定 (本 CLI 无 vault 路径查询子命令, 实测需 --root)
- 文件不存在或 check 失败时先完成绑定, 再继续本次请求

## 命令

### 无参数

`node scripts/config.mjs get` 读取 config, 报告 vault/root/inbox 与可用命令, 不写任何文件。

### config

1. `obsidian vaults` 列出候选, 让用户选择 (**必须等待用户确认, 不得自行代选**)
2. `node scripts/config.mjs set --vault <名称>` 完成绑定, inbox 向用户确认 (非 `10_inbox` 时加 `--inbox`)

**完成标准：** `node scripts/config.mjs check` 退出码 0。

### add [vault=<名称>] <内容>

`vault=` 临时覆盖目标 vault, 不修改 config (此情形仅走 CLI 通道)。

**内容分型：**

- `<内容>` 为纯 URL → **资源类型**: 抓取网页内容, 按资源模板整理
- 其他 → **经验类型**: 按整理规则改写为经验卡

**资源模板** (纯 URL 时)：

- frontmatter: `type: resource` + `url` + `tags` + `description` + `create_at`/`update_at` (ISO 日期); `description` 即那句话总结
- 正文布局: `# 中文短标题` (技术名保留英文) + 一句话总结该 URL 的内容

**整理规则** (经验类型, 项目无关化)：

- 表述为通用方法与最佳实践；不出现项目路径、业务专有名词 (代码示例中的路径一律参数化)
- 参数不从记忆编造: 读源码/实现或文档查证机制与数值 (时长、延迟、公式等) 后, 脱敏提炼再落笔
- 内容为代码方案/逻辑时按**可复现**标准记录 —— 目标是下次遇到类似需求, 仅凭笔记即可复现代码、完成逻辑:
  - 记录用到的第三方依赖库名与关键 API (含系统工具链, 如渲染/转换工具)
  - 附经实际运行验证的完整逻辑代码: 从实现源码原样摘录后脱敏 (去项目路径/业务名), 不凭记忆改写、不压缩为伪代码
  - 正文布局: 场景 → 方法 → 要点与坑 → 依赖 → 完整代码
- 纯算法或语言标准库足以表达的原理, 代码用最小可复现 demo 或伪代码
- 提炼中文短标题作文件名 (技术名保留英文), 日期只进 frontmatter

**tags 规范** (添加/修改 tags 时执行)：

1. 先查目标 vault 的 tags: `obsidian tags` (`vault=` 覆盖时用 `obsidian vault=<名称> tags`)
2. 语义去重: 候选 tag 与已有 tag 同义 → 复用已有 tag, 不新建
3. 语义正交: 整组 tags 语义互不重叠, 组合起来能概括该内容
4. 目标 vault 与查询时不一致 (换绑/迁移) 时, 对新 vault 重跑本规范

**写入流程：**

1. 查重: 目标 inbox 下已有同名文件 → 以 `## YYYY-MM-DD` 小节追加并更新 `update_at`; 否则新建
2. tags 按 tags 规范对照后再写入; 新建文件 frontmatter 按内容分型: 资源类型用资源模板, 经验类型用 `type: note` + `tags` + `description` + `create_at`/`update_at` (ISO 日期); 正文为对应模板布局
3. 通道: 优先 `obsidian vault=<vault> create|append path=<inbox>/<标题>.md content=...`; CLI 通道不可用 (命令不存在/未注册/参数报错) 时**重试一次**, 仍失败且 config 有 `root` 时直接写 `<root>/<inbox>/<标题>.md`; 两者都不可用则报错停止

**完成标准：** 文件已写入 (tags 按规范复核: 无语义重复、整组能概括内容), 报告路径与抽象要点 (原文 → 经验卡改写了什么)。
