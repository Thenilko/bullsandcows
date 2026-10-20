#!/usr/bin/env bash
# Стъпка 5: билд и деплой на Worker-а (SPA + API + Durable Objects). Отпечатва URL-а.
source "$(dirname "$0")/common.sh"
# Публичните стойности за клиента (Supabase режим) от apps/server/.dev.vars; не се отпечатват.
VITE_SUPABASE_URL="$(devvar SUPABASE_URL)"
VITE_SUPABASE_ANON_KEY="$(devvar SUPABASE_ANON_KEY)"
test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" \
  || { echo "Липсват SUPABASE_URL/SUPABASE_ANON_KEY в apps/server/.dev.vars"; exit 1; }
export VITE_AUTH_MODE=supabase VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY
cd "$ROOT" && pnpm --filter web build >/dev/null
# Проверка: бъндълът трябва да носи адреса на Supabase проекта (иначе клиентът е без Supabase режим).
grep -lq "$PROJECT_REF.supabase.co" "$ROOT"/apps/web/dist/assets/*.js \
  || { echo "Бъндълът не съдържа $PROJECT_REF.supabase.co — спирам деплоя."; exit 1; }
cd "$ROOT/apps/server"
set +e; OUT="$(pnpm exec wrangler deploy 2>&1)"; RC=$?; set -e
printf '%s\n' "$OUT" | grep -viE "token|Metrics|\.env" | tail -12
test $RC -eq 0 || { echo "wrangler deploy се провали (код $RC)"; exit $RC; }
