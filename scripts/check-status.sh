#!/usr/bin/env bash
# 探测本机 / 容器侧自建 warframe-status 是否可用
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3001}"
BASE_URL="${BASE_URL%/}"

ok() { printf 'ok  %s\n' "$1"; }
fail() { printf 'fail %s\n' "$1" >&2; exit 1; }

echo "checking ${BASE_URL} ..."

if curl -fsS --max-time 15 "${BASE_URL}/heartbeat" >/dev/null 2>&1; then
  ok "GET /heartbeat"
elif curl -fsS --max-time 15 "${BASE_URL}/pc" >/dev/null 2>&1; then
  ok "GET /pc (heartbeat missing, pc ok)"
else
  fail "neither /heartbeat nor /pc responded at ${BASE_URL}"
fi

# 可选：拉一段中文 worldstate 确认数据可用
if body="$(curl -fsS --max-time 60 "${BASE_URL}/pc?language=zh" 2>/dev/null)"; then
  if printf '%s' "$body" | head -c 1 | grep -q '{'; then
    ok "GET /pc?language=zh (json)"
  else
    fail "GET /pc?language=zh returned non-json"
  fi
else
  fail "GET /pc?language=zh"
fi

echo "warframe-status looks healthy"
