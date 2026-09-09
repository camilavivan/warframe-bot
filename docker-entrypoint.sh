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
    echo "[warframe-bot] Provide config via volume mount or bake one into the image."
    exit 1
  fi
fi

mkdir -p /app/data
exec node dist/index.js
