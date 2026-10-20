#!/usr/bin/env bash
# Стъпка 5: билд и деплой на Worker-а (SPA + API + Durable Objects). Отпечатва URL-а.
source "$(dirname "$0")/common.sh"
cd "$ROOT" && pnpm --filter web build >/dev/null
cd "$ROOT/apps/server" && pnpm exec wrangler deploy 2>&1 | grep -viE "token" | tail -8
