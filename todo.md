# TODO

## feynman-explainer 持久化（暂缓，选了 C）

**现状**：方案 C —— 纯对话内检索，术语复现时先问用户回忆再讲。不落盘。

**C 的代价**：拿不到跨 session 的间隔重复。C 的记忆是当前 context window，
同会话内复现能触发检索；新会话里 agent 不知道用户学过什么。
间隔需要真实时间间隔，结构上跨 session。

**注**：这不是费曼技巧的残缺。费曼是理解技术（产出语言 → 缺口显形 → 只补缺口），
全程发生在当次；需要记忆的是间隔重复，另一个技术。

**不选 A 的原因**：目的是 skill 原子化。A 的推荐理由——复用 obsidian-kit 的 vault——
本身就是耦合来源：feynman-explainer 要么读 obsidian-kit 的配置，要么在自己的配置里
重复一遍 vault 路径。两者都违背原子化。

精确说，A 可以退化成 A′：日志和脚本都归 feynman-explainer 自己，配置只存自己那行路径，
落点选一个中性目录。那时不耦合，但"复用 vault"这个好处也随之消失。

**升级时从这里开始**：

### A. vault 日志 + 脚本（已否决：耦合，见上）

- 日志放 Obsidian vault（已在用 obsidian-kit），配置只存 vault 路径
- 条目最小形状：术语 | 那句工程判断 | 日期 | 领域
- 术语已在日志 → 不讲，先问回忆，再亮日志里的判断，只补缺口

**修正：脚本的理由在写路径，不在读路径。**

原先记的是"脚本的决定性理由是 context 经济：Read 找一个术语要吞整个日志"。
这个前提错了，它假设了朴素 Read。实际读路径可以走 Obsidian 查询——
按 tags / description / title 检索，只回命中条目，agent 再对候选做相关性匹配。
日志多大都不影响读成本。

脚本剩下的理由是**写路径**：append 时保证 frontmatter、tags、description 格式一致，
避免 agent 手改 markdown 漂移。

附带推论：读路径便宜的前提是写路径规范——条目的 description/tags 质量决定查询能否命中。
两条路径通过写时元数据绑在一起。

### B. 原生 autoMemoryDirectory

- 读取自任意 settings scope；写进 `~/.claude/settings.json` 即全局
- `MEMORY.md` 每会话只加载前 200 行/25KB；topic 文件按需
- 不推荐：auto memory 面向 agent 事实（一事实一文件 + frontmatter，harness 管理）；
  学习日志是用户数据，几百条会碎

### D. 独立的持久化连接 skill（未来方向）

不单独维护 feynman-explainer 的日志。改为新建一个**原子化连接 skill**，专职持久化，
vault 是它的一种后端。feynman-explainer 保持纯粹，只依赖持久化契约而非具体实现。
这样 A′ 也不必做了。

两条落地形式：

1. **连接 skill** —— 新 skill，负责读写
2. **裸脚本** —— 放 skill 系统之外，任何 skill 都能指向它
   （见 writing-for-agents SKILL-MECHANICS：两个 user-invoked skill 共用的东西
   应该放到 skill 系统外）

**机制约束（关键）**：连接 skill 必须 **model-invoked**（保留 description）。
user-invoked 的 skill 没有任何其他 skill 够得到——obsidian-kit 正是
`disable-model-invocation: true`，所以 feynman-explainer 调不到它。
这解释了为什么不能在 obsidian-kit 上直接扩展。

### 已核实的约束（勿重新调研）

- `~/.claude` 在 protected directories：写入永不自动批准，
  `permissions.allow` 不能预批准，`dontAsk` 直接拒绝
- 推论：高频写的数据不放 `.claude`，低频配置可以。obsidian-kit 正是此结构
- 普通 skill 的用户数据位置：**官方文档空白**。
  只有 plugin skill 有 `${CLAUDE_PLUGIN_DATA}`
- Skill 全文载入后跨轮常驻；SKILL.md 官方建议 < 500 行，CLAUDE.md < 200 行
- `@import` 不省 context（启动时展开）

### 待实测

1. `.claude` 保护路径是否命中 `~/.claude/` 绝对形式
2. sandbox 默认写范围 = cwd 及子目录；home 下其他位置需 `sandbox.filesystem.allowWrite`
