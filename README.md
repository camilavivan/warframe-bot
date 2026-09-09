# warframe-bot

中文 Warframe **信息查询** + **世界状态推送** 机器人，同时支持：

1. **QQ** — OneBot v11（HTTP 上报接收 + HTTP API 发送，兼容 NapCat / go-cqhttp / Lagrange）
2. **KOOK** — 官方 Bot WebSocket 网关

数据来源：[api.warframestat.us](https://api.warframestat.us)（`language=zh`）、[Warframe.market](https://warframe.market)。

> 功能参考（**仅作需求对照，本仓库为独立原创实现，未复制其源码**）：
> [WFBot](https://github.com/TRKS-Team/WFBot)、[AaTMbot](https://github.com/AaTM-M/AaTMbot)、[warframe-world-state](https://github.com/WFCD/warframe-worldstate-data)、[ghcruise/WarframeBot](https://github.com/ghcruise/WarframeBot)。

## 功能

| 命令 | 说明 |
|------|------|
| `菜单` | 帮助 |
| `突击` / `仲裁` | 每日突击、仲裁 |
| `裂缝` / `钢铁裂缝` / `虚空风暴` | 虚空裂缝筛选 |
| `入侵` / `警报` | 入侵与警报 |
| `奸商` / `特惠` | Baro / Darvo |
| `赏金 地球\|金星\|火卫二` | 平原赏金 |
| `平原` / `地球` / `金星` / `火卫二` / `扎里曼` | 开放世界周期 |
| `电波` / `新闻` / `活动` / `舰队` / `猎杀` | 其他世界状态 |
| `wm <物品>` | Warframe.market 在线买卖价 |
| `翻译 <关键词>` | 物品搜索 |
| `订阅列表` / `订阅 <主题>` / `取消订阅 <主题>` | 推送管理 |

**推送主题**：`sortie` `arbitration` `fissures` `cetus-night` `invasions` `voidtrader` `darvo` `archon`  
轮询间隔默认 60s，SQLite 去重，按平台 + 群/频道/用户 ID + `chat_type` 存储订阅。

默认指令前缀：`wf ` 与 `/`（可在配置中修改）。

### 私聊（QQ / OneBot）

- **私聊可用查询**：私聊与群聊一样可使用全部查询命令。
- **私聊也可订阅推送**：`订阅` / `取消订阅` / `订阅列表` 在私聊中生效，推送走 `send_private_msg`。
- **前缀更宽松**：群聊仍需配置的前缀（如 `wf ` / `/`）；**私聊可省略前缀**直接发 `突击`、`平原` 等。
- KOOK：支持 `channel_type === PERSON` 的私信查询与订阅（`/direct-message/create`）；频道行为不变。

## 要求

- Node.js **20+**
- 构建原生模块 `better-sqlite3` 需要 Python3 / make / g++（Docker 镜像已包含）

## 快速开始

```bash
cp config.example.yaml config.yaml
# 编辑 config.yaml：填写 OneBot / KOOK

npm install
npm run build
npm start
```

开发与自检：

```bash
npm run dry-run   # 拉取实时 API，打印中文摘要
npm test          # 单元测试（格式化 / 裂缝过滤 / 去重 / 中文词典）
npm run fetch-lexicon  # 刷新 solNodes 生成词典（可选）
```

## OneBot（QQ）配置

1. 部署 NapCat / go-cqhttp / Lagrange，开启 **HTTP API**（例如 `5700`）与 **HTTP 上报**（反向 POST 到本机器人）。
2. `config.yaml` 示例：

```yaml
onebot:
  enabled: true
  host: "0.0.0.0"
  port: 6700                 # 本机器人接收上报
  accessToken: ""            # 可选
  apiBase: "http://127.0.0.1:5700"   # OneBot HTTP API
  apiAccessToken: ""
```

3. 在 OneBot 实现中把「上报 URL」设为 `http://<bot主机>:6700/`（POST）。
4. 群内发送：`wf 菜单` 或 `/突击`。
5. 私聊可直接发送：`菜单` / `突击` / `订阅 cetus-night`（无需前缀）。

Docker 访问宿主机 OneBot 时，可将 `apiBase` 设为 `http://host.docker.internal:5700`。

## KOOK 配置

1. 在 [KOOK 开发者后台](https://developer.kookapp.cn/) 创建机器人，获取 Token，邀请 Bot 进服务器并授予发消息权限。
2. 配置：

```yaml
kook:
  enabled: true
  token: "你的BotToken"
```

或使用环境变量 `KOOK_TOKEN`。

3. 在频道发送：`wf 平原` / `/订阅 cetus-night`。

## Docker

```bash
cp config.example.yaml config.yaml
docker compose up -d --build
```

数据目录 `./data` 挂载保存 SQLite（订阅与推送去重）。

## 项目结构

```
src/
  index.ts              # 入口
  config.ts             # YAML + env
  core/                 # API、缓存、格式化、中文词典、dry-run
  commands/             # 命令注册与处理（群/私聊）
  push/                 # 轮询、去重、订阅（SQLite，含 chat_type）
  adapters/onebot/      # Fastify HTTP 接收 + 群/私聊发送
  adapters/kook/        # WebSocket 网关 + 频道/私信发送
scripts/
  fetch-zh-lexicon.mjs  # 拉取 solNodes 生成 locale-zh.generated.ts
```

## 许可

MIT
