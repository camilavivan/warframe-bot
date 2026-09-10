#!/bin/sh
set -e
cd /app

if [ ! -f /app/config.yaml ]; then
  if [ -f /app/config.example.yaml ]; then
    echo "[warframe-bot] WARNING: /app/config.yaml missing — copying from config.example.yaml"
    echo "[warframe-bot] Mount your own config: -v ./config.yaml:/app/config.yaml:ro"
    cp /app/config.example.yaml /app/config.yaml
  else
    echo "[warframe-bot] ERROR: /app/config.yaml not found and no config.example.yaml to copy."
    exit 1
  fi
fi

mkdir -p /app/data

# Volume mounts often arrive as root-owned; node user then cannot open SQLite.
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/data 2>/dev/null || true
  if [ -f /app/config.yaml ] && [ -w /app/config.yaml ]; then
    chown node:node /app/config.yaml 2>/dev/null || true
  fi
  echo "[warframe-bot] data dir ready; dropping privileges to user node"
  exec runuser -u node -- node dist/index.js
fi

if [ ! -w /app/data ]; then
  echo "[warframe-bot] ERROR: /app/data is not writable by $(id -un) (uid=$(id -u))."
  echo "[warframe-bot] On host run: mkdir -p data && chown -R 1000:1000 data"
  exit 1
fi

exec node dist/index.js
