# Multi-stage production image for warframe-bot
# Build: docker build -t warframe-bot .
# Health: GET http://127.0.0.1:6700/health (always available; see config.health)

# 国内若拉不动 Docker Hub，构建时指定镜像，例如：
#   docker compose build --build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:22-bookworm-slim
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /app

# Native build tools for better-sqlite3 (only in build stage)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
  && npm prune --omit=dev

# --- runtime ---
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

# Matching glibc/libstdc++ for better-sqlite3 native binding
RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 curl util-linux \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data \
  && chown -R node:node /app

ENV NODE_ENV=production \
    CONFIG_PATH=/app/config.yaml

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./
COPY --chown=node:node config.example.yaml ./
COPY --chown=node:node fixtures ./fixtures
COPY --chown=node:node assets ./assets
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node docker-entrypoint.sh ./

VOLUME ["/app/data"]
EXPOSE 6700

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:6700/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
