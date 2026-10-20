#!/usr/bin/env bash
# Стъпка 4: качва четирите тайни в Worker-а от apps/server/.dev.vars (без да ги показва).
# Worker-ът трябва вече да съществува (стъпка 5 поне веднъж) — иначе wrangler пита дали да го създаде.
source "$(dirname "$0")/common.sh"
need "$ROOT/apps/server/.dev.vars"
cd "$ROOT/apps/server"
for NAME in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY DAILY_SALT; do
  VAL="$(devvar "$NAME")"; test -n "$VAL" || { echo "Липсва $NAME в .dev.vars"; exit 1; }
  set +e; OUT="$(printf '%s' "$VAL" | pnpm exec wrangler secret put "$NAME" 2>&1)"; RC=$?; set -e
  printf '%s\n' "$OUT" | grep -viE "token|value|Metrics|\.env|dev\.vars" | grep -iE "success|error|✘|not" | head -2 || true
  test $RC -eq 0 || { echo "wrangler secret put $NAME се провали (код $RC)"; exit $RC; }
done
echo "OK: тайните са качени."
