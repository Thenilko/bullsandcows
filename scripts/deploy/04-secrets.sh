#!/usr/bin/env bash
# Стъпка 4: качва четирите тайни в Worker-а от apps/server/.dev.vars (без да ги показва).
source "$(dirname "$0")/common.sh"
need "$ROOT/apps/server/.dev.vars"
cd "$ROOT/apps/server"
for NAME in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY DAILY_SALT; do
  VAL="$(devvar "$NAME")"; test -n "$VAL" || { echo "Липсва $NAME в .dev.vars"; exit 1; }
  printf '%s' "$VAL" | pnpm exec wrangler secret put "$NAME" 2>&1 | grep -viE "$NAME=|value" | tail -1
done
echo "OK: тайните са качени."
