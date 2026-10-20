#!/usr/bin/env bash
# Общи помощници за деплой. Тайните се четат от git-ignored файлове; нищо не се отпечатва.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_REF="ccwgbkvukmtnieqncqno"
WORKER_ROLE="pasishte"
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-$(head -1 "$ROOT/.env.local" | tr -d '[:space:]')}"
need() { test -s "$1" || { echo "Липсва файл: $1"; exit 1; }; }
devvar() { grep "^$1=" "$ROOT/apps/server/.dev.vars" | head -1 | cut -d= -f2-; }
