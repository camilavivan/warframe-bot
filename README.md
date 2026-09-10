# warframe-bot

中文 Warframe **信息查询** + **世界状态推送** 机器人，同时支持：

1. **QQ OneBot** — OneBot v11（HTTP 上报接收 + HTTP API 发送，兼容 NapCat / go-cqhttp / Lagrange）
2. **QQ 官方开放平台** — AppID + AppSecret（WebSocket / Webhook，群 @ + C2C 私聊）
3. **KOOK** — 官方 Bot WebSocket 网关

数据来源：**默认直连 DE CDN** [`api.warframe.com/cdn/worldState.php`](https://api.warframe.com/cdn/worldState.php) + [`warframe-worldstate-parser`](https://www.npmjs.com/package/warframe-worldstate-parser)（`api.source: de`，国内推荐）；亦可 [api.warframestat.us](https://api.warframestat.us) / 自建 [WFCD/warframe-status](https://github.com/WFCD/warframe-status)；市场价走 [Warframe.market](https://warframe.market)。旧 `content.warframe.com/dynamic/worldState.php` 已全局 **404**。

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
- QQ 官方：群内需 **@机器人**；C2C 私聊可省略前缀；推送走开放平台主动消息 API（受平台限额约束）。

## 要求

- Node.js **20+**（Docker 镜像使用 **Node 22 LTS bookworm-slim**）
- 构建原生模块 `better-sqlite3` 需要 Python3 / make / g++（Docker 构建阶段已包含）

## 一键 Docker 部署（推荐）

> **国内服务器**：已去掉 `# syntax=docker/dockerfile:1`，避免额外访问 Docker Hub。若拉取 `node` 仍超时，用镜像源构建：
> ```bash
> docker-compose build --build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:22-bookworm-slim
> docker-compose up -d
> ```
> 或配置 `/etc/docker/daemon.json` 的 `registry-mirrors` 后重启 dockerd。也可尝试关闭 BuildKit：`DOCKER_BUILDKIT=0 docker-compose up -d --build`。


```bash
git clone https://github.com/camilavivan/warframe-bot.git
cd warframe-bot

# 1) 配置
cp config.example.yaml config.yaml
# 编辑 config.yaml：OneBot / QQ 官方 / KOOK / 推送等

# 可选敏感项放 .env
cp .env.example .env
# KOOK_TOKEN=xxxx
# ONEBOT_ACCESS_TOKEN=xxxx
# QQ_BOT_APP_ID=xxxx
# QQ_BOT_SECRET=xxxx

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


## 世界状态来源（`api.source`）

| source | 说明 | 适用 |
|--------|------|------|
| **`de`**（**默认**） | 直连 `https://api.warframe.com/cdn/worldState.php`，bot 内用 `warframe-worldstate-parser` 解析 | **腾讯云等国内 VPS 推荐**；不依赖 warframe-status |
| `warframestat` | `api.baseUrl` → 官方或自建 warframe-status | 国外机房 / 已自建 status |
| `mock` | 本地 fixture（等同 `api.mock: true`） | 离线自测 |

```yaml
api:
  source: de
  deWorldStateUrl: "https://api.warframe.com/cdn/worldState.php"
  mock: false
```

环境变量：`WARFRAMESTAT_SOURCE=de` · `WARFRAME_DE_WORLDSTATE_URL=...`

> **说明**：旧地址 `content.warframe.com/dynamic/worldState.php` 已全局 404。自建 `ghcr.io/wfcd/warframe-status` 若仍拉旧 URL 会灌空/`WorldState Not Found`；核心推送/查询改用 `source: de` 后可停用 status 容器（或保留不用）。`wm` / `翻译` 仍走 Warframe.market / items（与 worldstate 来源无关）。仲裁依赖外部 kuva 源，DE-only 模式下可能暂缺。

## 自建 warframe-status

若 bot 报 `ECONNREFUSED ...:3001`：先 `curl http://127.0.0.1:3001/heartbeat`；不通则查 `docker logs warframe-status` / `warframe-warp`。普通 compose 请用 `baseUrl: http://warframe-status:3001`，不要用 `host.docker.internal`。WARP 方案需开启 `BETA_FIX_HOST_CONNECTIVITY=1`（已写入 `docker-compose.with-status-warp.yml`）。


> **优先推荐**：国内直接用上方 **`api.source: de`**，一般**不必**再部署 warframe-status。

若仍想用 warframestat 形态（或国外机房），国内访问官方 `https://api.warframestat.us` 常被 **Cloudflare HTTP 403** 拦截，可自建 [WFCD/warframe-status](https://github.com/WFCD/warframe-status)，bot 设 `source: warframestat` + `baseUrl: http://warframe-status:3001`。

> **注意**：旧 `content.warframe.com/.../worldState.php` 已 404；status 镜像若未切到 `api.warframe.com/cdn/worldState.php` 会灌空。status 容器仍需出网；内容服 geo-block 时见下方 WARP / 代理方案。

### 配置

`config.yaml`：

```yaml
api:
  baseUrl: "http://warframe-status:3001"  # compose 同网络
  # baseUrl: "http://host.docker.internal:3001"  # status 用 WARP 侧车时
  mock: false
```

### 常规（无 WARP）

默认 `docker-compose.yml` / `docker-compose.with-status.yml` 已包含 `warframe-status` 服务，bot `depends_on` 它，同网络用服务名互通。

```bash
cd /opt/warframe-bot   # 或你的部署目录
git pull
# 编辑 config.yaml：api.baseUrl + mock:false（见上）
mkdir -p ws-caches data
docker-compose up -d --build
# 或显式：docker compose -f docker-compose.with-status.yml up -d --build

curl -sS 'http://127.0.0.1:3001/pc?language=zh' | head
./scripts/check-status.sh
docker-compose logs -f warframe-status warframe-bot
```

### WARP 变体（内容服地理封锁）

当 status 能起来但对内容服超时/空数据时，使用端到端文件 `docker-compose.with-status-warp.yml`：

- `warp` 侧车发布 `3001:3001`
- `warframe-status` 使用 `network_mode: service:warp`（出网走 WARP）
- `warframe-bot` 仍在默认网络，经 `host.docker.internal:3001` 访问（**不能**再写 `http://warframe-status:3001`，因 status 已并入 warp 网络命名空间）

```bash
cd /opt/warframe-bot
git pull
# config.yaml:
#   api:
#     baseUrl: "http://host.docker.internal:3001"
#     mock: false
mkdir -p ws-caches data
docker compose -f docker-compose.with-status-warp.yml up -d --build

# WARP 首次注册约 30s+
docker compose -f docker-compose.with-status-warp.yml logs -f warp
curl -sS 'http://127.0.0.1:3001/heartbeat'
curl -sS 'http://127.0.0.1:3001/pc?language=zh' | head
./scripts/check-status.sh
docker compose -f docker-compose.with-status-warp.yml logs -f warframe-status warframe-bot
```

可选 WARP+：在 warp 服务环境变量中设置 `WARP_LICENSE_KEY`。官方示例见 [docker-compose.warp.example.yml](https://github.com/WFCD/warframe-status/blob/main/docker-compose.warp.example.yml)。

### 国内拉不到 `ghcr.io/wfcd/warframe-status`

不要把整个 warframe-status 仓库 vendoring 进本项目。任选其一：

1. 配置 Docker 镜像加速 / 代理后重试 `docker pull ghcr.io/wfcd/warframe-status:latest`
2. 另目录 clone 上游后本地构建，再在 compose 里改：

```yaml
warframe-status:
  # image: ghcr.io/wfcd/warframe-status:latest
  build:
    context: ../warframe-status   # 你 clone 的路径
    dockerfile: Dockerfile
```

3. 使用可拉取的第三方镜像源/转发（自行评估可信度）

缓存目录：`./ws-caches` → 容器 `/app/caches`（已在 `.gitignore`）。

### 探活脚本

```bash
./scripts/check-status.sh                 # 默认 http://127.0.0.1:3001
./scripts/check-status.sh http://127.0.0.1:3001
```


## 本地开发

```bash
cp config.example.yaml config.yaml
npm install
npm run build
npm start

npm run dry-run        # 拉取实时 API，打印中文摘要（含日历/研习/王境）
npm run dry-run:mock   # 使用本地 fixture，不访问外网
npm test               # 单元测试
npm run fetch-lexicon  # 刷新 solNodes 生成词典（可选）
```

## 模拟测试（无外网 / 被 CF 403）

国内机房访问 `api.warframestat.us` 常被 Cloudflare **HTTP 403**。可用本地 JSON fixture 跑通命令、dry-run 与推送轮询（不发起 warframestat 请求）。

```bash
# 本地
WARFRAMESTAT_MOCK=1 npm run dry-run
WARFRAMESTAT_MOCK=1 npm start
# 或快捷脚本：
npm run dry-run:mock

# Docker：config.yaml 设 api.mock: true，或 compose environment:
# - WARFRAMESTAT_MOCK=1
docker-compose up -d --build
# 然后对 OneBot 发 wf 突击 / wf 菜单
```

配置项（`config.yaml` / `config.example.yaml`）：

```yaml
api:
  mock: false
  mockFixturePath: ./fixtures/worldstate-pc-zh.json  # relative to cwd
```

环境变量：

| 变量 | 说明 |
|------|------|
| `WARFRAMESTAT_MOCK=1` / `true` | 开启模拟模式 |
| `WARFRAMESTAT_MOCK_FIXTURE=/path/to.json` | 覆盖 fixture 路径 |

镜像已内置 `fixtures/`；也可挂载覆盖：`- ./fixtures:/app/fixtures:ro`。

日志会出现一次：`warframestat mock mode enabled`（含 fixture 路径）。  
`wm` / `翻译` 在模拟模式下返回明确的 stub 数据，不崩溃、不访问 warframe.market / items API。

### 可选：宿主机假 API（不改代码 mock）

```bash
npm run serve-mock-api   # 默认 :3099，读取 fixtures/worldstate-pc-zh.json
# config.yaml:
#   api:
#     baseUrl: "http://host.docker.internal:3099"
# Docker 容器内即可用假 API，无需 WARFRAMESTAT_MOCK
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

## QQ 官方机器人

> **与 WorkBuddy 的区别**：[`https://q.qq.com/setup/`](https://q.qq.com/setup/) 引导安装的是 **WorkBuddy 等第三方 Agent 客户端**（把 QQ 当聊天前端跑 Agent）。本仓库适配的是 **[QQ 开放平台官方机器人 API](https://bot.q.qq.com/wiki/)**（AppID + AppSecret，自建后端），二者不是同一条产品线。自建 Warframe 查询/推送请走开放平台，不要把 WorkBuddy 配置当成 OneBot。

### 接入步骤

1. 打开 [QQ 开放平台](https://q.qq.com/) / [机器人文档](https://bot.q.qq.com/wiki/)，注册开发者并 **创建机器人**。
2. 在管理端拿到 **AppID**、**AppSecret**；开通 **群聊** / **C2C 私聊** 能力，订阅事件意图 `GROUP_AND_C2C_EVENT`（群 @ 消息 + 私聊）。
3. 把机器人拉进 **沙箱群**（开发阶段务必先沙箱验证）。
4. 配置 `config.yaml`（或环境变量），Docker 重建后在群内 **@机器人** 发送 `突击` / `wf 突击`：

```yaml
qqofficial:
  enabled: true
  appId: "你的AppID"          # 或 QQ_BOT_APP_ID
  secret: "你的AppSecret"     # 或 QQ_BOT_SECRET
  sandbox: true               # 首次建议 true
  removeAt: true
  # mode: websocket           # 默认；亦支持 webhook
  # webhookPort: 9000
  # webhookPath: /qqbot/webhook
```

```bash
# /opt/warframe-bot 示例
cp config.example.yaml config.yaml   # 若尚未有
# 编辑 qqofficial 段如上
# .env 亦可：
# QQ_BOT_APP_ID=...
# QQ_BOT_SECRET=...
docker compose up -d --build
docker compose logs -f warframe-bot
# 沙箱群：@机器人 突击
```

5. 正式上线前将 `sandbox: false`，并确认生产群已添加机器人。

### IP 白名单

开放平台可能要求配置 **服务器公网 IP 白名单**。腾讯云等 VPS 请填写实例的 **公网 IP**（多网卡/NAT 时以实际出网访问 `bots.qq.com` / `api.bot.qq.com` 的地址为准）。IP 变更后需同步更新白名单，否则换 Token / 连网关会失败。

### 指令面板

可在开放平台管理端配置展示用指令（如「突击」「裂缝」「平原」），方便用户点选；**真实逻辑仍由本仓库命令处理**，面板名称建议与代码别名一致。

### 与 OneBot 并存

`onebot` 与 `qqofficial` 可同时启用：前者对接 NapCat 等协议端，后者直连官方开放平台。订阅推送的 `platform` 字段分别为 `onebot` / `qqofficial`，互不覆盖。

## 故障排除

| 问题 | 处理 |
|------|------|
| `unable to open database file` / SQLITE_CANTOPEN | 宿主机执行 `mkdir -p data && chown -R 1000:1000 data` 后重启；新镜像入口会自动 chown |
| `better-sqlite3` 编译失败 | 安装 `python3 make g++`；或直接用 Docker 镜像 |
| 容器内无法写 `./data` | 确保宿主机 `./data` 目录对容器用户可写（镜像以 `node` 用户运行） |
| 健康检查失败 / OneBot 关闭 | 确认 `health.port` 暴露；`curl localhost:6700/health` |
| Docker 访问不到宿主机 OneBot | `apiBase` 用 `http://host.docker.internal:5700`，并保留 `extra_hosts` |
| QQ 官方连不上 / 鉴权失败 | 核对 AppID/Secret、IP 白名单、沙箱开关；群聊须 **@机器人**；先 `sandbox: true` |
| QQ 官方推送失败 | 主动消息受平台限额/权限约束；优先依赖用户 @ 后的被动回复；检查开放平台消息权限 |
| 奸商显示异常 | 新版 API 可能省略 `active` 字段，机器人会按 activation/expiry 推算 |
| 腾讯云等机房 IP 访问 `api.warframestat.us` 被 Cloudflare **HTTP 403** / status 灌空 | **推荐**：`api.source: de` + `mock: false`（直连 DE CDN，无需 status）。旧 content.warframe.com 已 404。仍可用自建 status（`source: warframestat`）或 WARP/代理 compose。**短期自测**：`WARFRAMESTAT_MOCK=1`。亦可 `HTTPS_PROXY` / `api.proxyUrl` |
| `ghcr.io/wfcd/warframe-status` 拉取失败 | 配镜像加速/代理；或 clone WFCD/warframe-status 后改 compose `build.context`（勿 vendoring 进本仓库） |
| status 容器 healthy 但 `/pc` 空/超时 | 内容服 geo-block → 换 WARP compose；`docker compose logs warframe-status` / `warp` |
| bot 连不上 status（WARP 方案） | WARP 下勿用服务名；`api.baseUrl` 须为 `http://host.docker.internal:3001`，并保留 bot 的 `extra_hosts` |

## 项目结构

```
src/
  index.ts              # 入口
  config.ts             # YAML + env
  health.ts             # 独立 /health（OneBot 关闭时）
  core/                 # API（含 de-worldstate）、缓存、格式化、中文词典、dry-run
  commands/             # 命令注册与处理（群/私聊）
  push/                 # 轮询、去重、订阅（SQLite，含 chat_type）
  adapters/onebot/      # Fastify HTTP 接收 + 群/私聊发送
  adapters/kook/        # WebSocket 网关 + 频道/私信发送
  adapters/qqofficial/  # QQ 开放平台 AppID/Secret（群@ + C2C）
scripts/
  fetch-zh-lexicon.mjs  # 拉取 solNodes 生成 locale-zh.generated.ts
  serve-mock-api.mjs    # 假 warframestat HTTP（:3099）供集成测试
  check-status.sh       # 探测自建 warframe-status（/heartbeat + /pc）
fixtures/
  worldstate-pc-zh.json # 离线模拟 worldstate（api.mock / WARFRAMESTAT_MOCK）
docker-compose.yml                 # bot + warframe-status（常规）
docker-compose.with-status.yml     # 同上，文档显式命名
docker-compose.with-status-warp.yml # bot + WARP 侧车 + status（中国 geo-block）
docker-entrypoint.sh    # 缺省 config 警告 / 复制示例
```

## 许可

MIT


## 无 TUN / WARP 失败时用 HTTP 代理

腾讯云等环境常无法跑 Cloudflare WARP 容器（缺 `/dev/net/tun`，日志出现 `Unable to connect to the CloudflareWARP daemon`）。可改用本机已有代理：

```bash
# 确认宿主机代理可用，例如 clash HTTP 7890
curl -x http://127.0.0.1:7890 -sS -o /dev/null -w '%{http_code}\n' https://content.warframe.com

# config.yaml → api.baseUrl: "http://warframe-status:3001" , mock: false
export WARFRAME_STATUS_PROXY=http://host.docker.internal:7890
docker-compose -f docker-compose.with-status-proxy.yml up -d --build
curl -sS 'http://127.0.0.1:3001/pc?language=zh' | head -c 200
```


### status 返回 `WorldState Not Found` / `/pc` 空 / 旧 URL 404

1. **优先**：bot 改用 `api.source: de`（见「世界状态来源」），可停用 status 容器。
2. 旧 `content.warframe.com/dynamic/worldState.php` 已全局 404；上游应为 `https://api.warframe.com/cdn/worldState.php`。
3. 若仍用 status：确认 bot `source: warframestat` 且 `baseUrl` 指向 status；清空 `ws-caches` 后重建。
4. 出网失败时用 `docker-compose.with-status-proxy.yml` + 代理，或直接让 bot 走 `source: de`（可配 `HTTPS_PROXY`）。
