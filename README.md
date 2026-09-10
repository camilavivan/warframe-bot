# warframe-bot

中文 Warframe **信息查询** + **世界状态推送** 机器人，同时支持：

1. **QQ** — OneBot v11（HTTP 上报接收 + HTTP API 发送，兼容 NapCat / go-cqhttp / Lagrange）
2. **KOOK** — 官方 Bot WebSocket 网关

数据来源：[api.warframestat.us](https://api.warframestat.us) 或自建 [WFCD/warframe-status](https://github.com/WFCD/warframe-status)（`language=zh`）、[Warframe.market](https://warframe.market)。国内 CF 403 见「自建 warframe-status」。

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


## 自建 warframe-status

若 bot 报 `ECONNREFUSED ...:3001`：先 `curl http://127.0.0.1:3001/heartbeat`；不通则查 `docker logs warframe-status` / `warframe-warp`。普通 compose 请用 `baseUrl: http://warframe-status:3001`，不要用 `host.docker.internal`。WARP 方案需开启 `BETA_FIX_HOST_CONNECTIVITY=1`（已写入 `docker-compose.with-status-warp.yml`）。


国内机房访问官方 `https://api.warframestat.us` 常被 **Cloudflare HTTP 403** 拦截。可在同一 Docker Compose 中自建 [WFCD/warframe-status](https://github.com/WFCD/warframe-status)，让机器人走内网 `http://warframe-status:3001`，**不再经过 Cloudflare**。

> **注意**：status 容器仍需出网拉取 Warframe **内容服** worldstate。若机房 IP 被内容服地理封锁（DE geo-block），请改用下方 **WARP 侧车** 方案，而不是只换 baseUrl。

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

## 故障排除

| 问题 | 处理 |
|------|------|
| `unable to open database file` / SQLITE_CANTOPEN | 宿主机执行 `mkdir -p data && chown -R 1000:1000 data` 后重启；新镜像入口会自动 chown |
| `better-sqlite3` 编译失败 | 安装 `python3 make g++`；或直接用 Docker 镜像 |
| 容器内无法写 `./data` | 确保宿主机 `./data` 目录对容器用户可写（镜像以 `node` 用户运行） |
| 健康检查失败 / OneBot 关闭 | 确认 `health.port` 暴露；`curl localhost:6700/health` |
| Docker 访问不到宿主机 OneBot | `apiBase` 用 `http://host.docker.internal:5700`，并保留 `extra_hosts` |
| 奸商显示异常 | 新版 API 可能省略 `active` 字段，机器人会按 activation/expiry 推算 |
| 腾讯云等机房 IP 访问 `api.warframestat.us` 被 Cloudflare **HTTP 403** | **推荐**：自建 warframe-status（见「自建 warframe-status」），`api.baseUrl: http://warframe-status:3001` 且 `mock: false`。内容服也被墙时用 `docker-compose.with-status-warp.yml` + `baseUrl: http://host.docker.internal:3001`。**短期自测**：`WARFRAMESTAT_MOCK=1` / `api.mock: true`。亦可 `HTTPS_PROXY` / `api.proxyUrl` 或 `npm run serve-mock-api` |
| `ghcr.io/wfcd/warframe-status` 拉取失败 | 配镜像加速/代理；或 clone WFCD/warframe-status 后改 compose `build.context`（勿 vendoring 进本仓库） |
| status 容器 healthy 但 `/pc` 空/超时 | 内容服 geo-block → 换 WARP compose；`docker compose logs warframe-status` / `warp` |
| bot 连不上 status（WARP 方案） | WARP 下勿用服务名；`api.baseUrl` 须为 `http://host.docker.internal:3001`，并保留 bot 的 `extra_hosts` |

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


### status 返回 `WorldState Not Found` / Drops 灌入 HTML

1. 确认 bot `api.baseUrl` 是 `http://warframe-status:3001`（不要仍是 `https://api.warframestat.us`）。
2. 清空 `ws-caches` 后设 `USE_WORLDSTATE=true`、`FEATURES=worldstate`、`BUILD=build` 重建 status。
3. 若容器内访问 `content.warframe.com/dynamic/worldState.php` 也失败，改用 `docker-compose.with-status-proxy.yml` + 代理。
