#!/usr/bin/env bash
# Стъпка 5: билд и деплой на Worker-а (SPA + API + Durable Objects). Отпечатва URL-а.
source "$(dirname "$0")/common.sh"
cd "$ROOT" && pnpm --filter web build >/dev/null
cd "$ROOT/apps/server"
set +e; OUT="$(pnpm exec wrangler deploy 2>&1)"; RC=$?; set -e
printf '%s\n' "$OUT" | grep -viE "token|Metrics|\.env" | tail -12
test $RC -eq 0 || { echo "wrangler deploy се провали (код $RC)"; exit $RC; }
