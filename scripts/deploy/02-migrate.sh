#!/usr/bin/env bash
# Стъпка 2: пуска Drizzle миграциите като ролята на Worker-а през Session pooler-а.
# Нужен файл: local/deploy/pooler.host (напр. aws-0-eu-west-2.pooler.supabase.com) — от Supabase → Connect → Session pooler.
source "$(dirname "$0")/common.sh"
need "$ROOT/local/deploy/worker.pw"; need "$ROOT/local/deploy/pooler.host"
PW="$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(open(sys.argv[1]).read().strip(),safe=''))" "$ROOT/local/deploy/worker.pw")"
HOST="$(tr -d '[:space:]' < "$ROOT/local/deploy/pooler.host")"
URL="postgres://${WORKER_ROLE}.${PROJECT_REF}:${PW}@${HOST}:5432/postgres"
printf '%s\n' "$URL" > "$ROOT/local/deploy/database.url"
cd "$ROOT" && DATABASE_URL="$URL" pnpm --filter server db:migrate 2>&1 | sed "s#${PW}#***#g"
echo "OK: миграциите са приложени."
