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
| `裂缝` / `钢铁裂缝` / `虚空风暴` | 虚空裂缝（含钢铁之路 / SP 虚空风暴） |
| `入侵` / `警报` | 入侵与警报 |
| `奸商` / `特惠` | Baro / Darvo |
| `赏金 地球\|金星\|火卫二` | 平原赏金 |
| `平原` / `地球` / `金星` / `火卫二` / `扎里曼` | 开放世界周期 |
| `日历` / `1999` / `hex日历` | **1999 Hex 日历**（季节、循环年、近期待办/大奖/覆盖） |
| `深层` / `deep` / `archimedea` | **深层研习 / 时空研习**（`archimedeas`） |
| `双衍王境` / `duviri` / `circuit` | **双衍王境情绪与回路选项** |
| `电波` / `新闻` / `活动` / `舰队` / `猎杀` | 其他世界状态 |
| `wm <物品>` | Warframe.market 在线买卖价 |
| `翻译 <关键词>` | 物品搜索 + 本地词典 |
| `订阅列表` / `订阅 <主题>` / `取消订阅 <主题>` | 推送管理 |

**推送主题**：`sortie` `arbitration` `fissures` `cetus-night` `invasions` `voidtrader` `darvo` `archon` `calendar`  
轮询间隔默认 60s，SQLite 去重，按平台 + 群/频道/用户 ID + `chat_type` 存储订阅。

默认指令前缀：`wf ` 与 `/`（可在配置中修改）。

### 私聊（QQ / OneBot）

- **私聊可用查询**：私聊与群聊一样可使用全部查询命令。
- **私聊也可订阅推送**：`订阅` / `取消订阅` / `订阅列表` 在私聊中生效，推送走 `send_private_msg`。
- **前缀更宽松**：群聊仍需配置的前缀（如 `wf ` / `/`）；**私聊可省略前缀**直接发 `突击`、`平原` 等。
- KOOK：支持 `channel_type === PERSON` 的私信查询与订阅（`/direct-message/create`）；频道行为不变。

## 要求

- Node.js **20+**（Docker 镜像使用 **Node 22 LTS bookworm-slim**）
- 构建原生模块 `better-sqlite3` 需要 Python3 / make / g++（Docker 构建阶段已包含）

## 一键 Docker 部署（推荐）

```bash
git clone https://github.com/camilavivan/warframe-bot.git
cd warframe-bot

# 1) 配置
cp config.example.yaml config.yaml
# 编辑 config.yaml：OneBot / KOOK / 推送等

# 可选敏感项放 .env
cp .env.example .env
# KOOK_TOKEN=xxxx
# ONEBOT_ACCESS_TOKEN=xxxx

# 2) 构建并后台启动
docker compose up -d --build

# 3) 看日志 / 健康检查
docker compose logs -f warframe-bot
curl -sS http://127.0.0.1:6700/health
```

数据持久化：`./data` → 容器 `/app/data`（SQLite 订阅与推送去重）。  
配置只读挂载：`./config.yaml:/app/config.yaml:ro`。

### Docker 下对接 OneBot（NapCat 等）

| 场景 | `onebot.apiBase` | 上报 URL（OneBot → 本机器人） |
|------|------------------|-------------------------------|
| OneBot 在**宿主机** | `http://host.docker.internal:5700` | `http://<宿主机IP>:6700/` 或 `http://127.0.0.1:6700/` |
| OneBot 在**同 compose 网络** | `http://napcat:5700`（服务名） | `http://warframe-bot:6700/` |

compose 已配置 `extra_hosts: host.docker.internal:host-gateway`。  
同网示例见 `docker-compose.example.yaml` 内注释。

### 健康检查说明

- 默认端口 **6700**，路径 **`/health`**。
- **OneBot 启用且端口=6700**：复用 OneBot Fastify 的 `/health`。
- **OneBot 关闭**（或 `health.port` 与 OneBot 不同）：自动启动独立轻量 health 服务（`src/health.ts`），保证 Docker `HEALTHCHECK` 始终可用。
- 配置项：`health.host` / `health.port`（默认 `0.0.0.0:6700`）。

### 镜像要点

- 多阶段构建：`node:22-bookworm-slim`
- `npm ci` + `package-lock.json`
- 非 root 用户 `node`
- 入口脚本：缺少 `config.yaml` 时从 `config.example.yaml` 复制并打印警告

## 本地开发

```bash
cp config.example.yaml config.yaml
npm install
npm run build
npm start

npm run dry-run        # 拉取实时 API，打印中文摘要（含日历/研习/王境）
npm test               # 单元测试
npm run fetch-lexicon  # 刷新 solNodes 生成词典（可选）
```

## OneBot（QQ）配置

1. 部署 NapCat / go-cqhttp / Lagrange，开启 **HTTP API**（例如 `5700`）与 **HTTP 上报**（反向 POST 到本机器人）。
2. `config.yaml` 示例：

```yaml
onebot:
  enabled: true
  host: "0.0.0.0"
  port: 6700
  accessToken: ""
  apiBase: "http://127.0.0.1:5700"   # Docker 宿主机: http://host.docker.internal:5700
  apiAccessToken: ""
```

3. 在 OneBot 实现中把「上报 URL」设为 `http://<bot主机>:6700/`（POST）。
4. 群内发送：`wf 菜单` 或 `/突击`。
5. 私聊可直接发送：`菜单` / `突击` / `订阅 cetus-night`（无需前缀）。

## KOOK 配置

1. 在 [KOOK 开发者后台](https://developer.kookapp.cn/) 创建机器人，获取 Token，邀请 Bot 进服务器并授予发消息权限。
2. 配置：

```yaml
kook:
  enabled: true
  token: "你的BotToken"
```

或使用环境变量 `KOOK_TOKEN`（Docker 可用 `env_file: .env`）。

3. 在频道发送：`wf 平原` / `/订阅 cetus-night`。

## 故障排除

| 问题 | 处理 |
|------|------|
| `better-sqlite3` 编译失败 | 安装 `python3 make g++`；或直接用 Docker 镜像 |
| 容器内无法写 `./data` | 确保宿主机 `./data` 目录对容器用户可写（镜像以 `node` 用户运行） |
| 健康检查失败 / OneBot 关闭 | 确认 `health.port` 暴露；`curl localhost:6700/health` |
| Docker 访问不到宿主机 OneBot | `apiBase` 用 `http://host.docker.internal:5700`，并保留 `extra_hosts` |
| 奸商显示异常 | 新版 API 可能省略 `active` 字段，机器人会按 activation/expiry 推算 |

## 项目结构

```
src/
  index.ts              # 入口
  config.ts             # YAML + env
  health.ts             # 独立 /health（OneBot 关闭时）
  core/                 # API、缓存、格式化、中文词典、dry-run
  commands/             # 命令注册与处理（群/私聊）
  push/                 # 轮询、去重、订阅（SQLite，含 chat_type）
  adapters/onebot/      # Fastify HTTP 接收 + 群/私聊发送
  adapters/kook/        # WebSocket 网关 + 频道/私信发送
scripts/
  fetch-zh-lexicon.mjs  # 拉取 solNodes 生成 locale-zh.generated.ts
docker-entrypoint.sh    # 缺省 config 警告 / 复制示例
```

## 许可

MIT
