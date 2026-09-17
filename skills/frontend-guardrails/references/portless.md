# 命名 URL（portless）

装与不装的判断、收益与适合的情形在 SKILL.md 第 5 步；这里是装配细节与陷阱。要求 Node.js 24+。

## 装配

```bash
pnpm add -D portless
```

`portless.json`：`{ "name": "myapp", "script": "dev" }`——`script` 是要跑哪条 npm script，缺省取 `package.json` 的 `name` 与 `dev`。

- **保留原有 `dev` script 不动**，另加一条 `dev:portless`（内容就是 `portless`）；CI 与 E2E 的 `webServer` 继续走固定端口
- 走 portless 起服务时，**`baseURL` 与 `webServer.url` 必须一致**这条照旧——此时写它打印的域名，不再是 `localhost:<port>`
- **script 里不写死 `-p <port>`**：代理注入 `PORT`（另有 `PORTLESS_URL`、`NODE_EXTRA_CA_CERTS`），Next 未传 `-p` 时读它

## 代理不在 443 = URL 带端口

代理监听 443，URL 才免端口。非交互环境（agent 拉起）不弹 sudo，退回非特权端口，URL 变成 `https://<name>.localhost:1355` 这种。

- 判定：`pnpm exec portless doctor` 报 `Proxy is responding on port 443`
- 修法：**提示用户自己另开一个终端**跑 `pnpm exec portless proxy start` 并输入密码——它自动 sudo 提权，密码只能交互输入，agent 不代跑，也不要塞进会话内执行；开机自启用 `pnpm exec portless service install`
- 证书两项：`~/.portless/ca.srl` 被 root 属主写坏时，新主机证书 0 字节、TLS 连接被重置，`rm ~/.portless/ca.srl` 让 portless 重建；HTTPS 证书要进系统信任库，首次没弹窗就补 `portless trust`（`doctor` 检查这一项），Safari 不认 `.localhost` 通配时 `portless hosts sync`

**验证**：`pnpm dev:portless` 起得来后，`portless list` 里应有该工作树的域名，且**不带端口**。带端口就是代理不在 443，按上面处理，并把要用户手跑的命令写进报告的"需用户手动完成"。
