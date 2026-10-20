#!/usr/bin/env bash
# Общи помощници за деплой. Тайните се четат от git-ignored файлове; нищо не се отпечатва.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_REF="ccwgbkvukmtnieqncqno"
WORKER_ROLE="pasishte"
token_from() { test -s "$1" && head -1 "$1" | sed 's/^[A-Za-z_]*=//' | tr -d '[:space:]' || true; }
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-$(token_from "$ROOT/local/deploy/cf.token")}"
test -n "$CLOUDFLARE_API_TOKEN" || export CLOUDFLARE_API_TOKEN="$(token_from "$ROOT/.env.local")"
test -n "$CLOUDFLARE_API_TOKEN" || { echo "Липсва Cloudflare API токен: сложи го на един ред в local/deploy/cf.token"; exit 1; }
need() { test -s "$1" || { echo "Липсва файл: $1"; exit 1; }; }
devvar() { grep "^$1=" "$ROOT/apps/server/.dev.vars" | head -1 | cut -d= -f2-; }
