#!/usr/bin/env bash
# Стъпка 1: създава (или сменя паролата на) ролята за Worker-а; паролата е в local/deploy/worker.pw.
# С --i-know-this-drops-everything ПРЕДИ това изтрива всички таблици на приложението и схемата drizzle.
# Отказва изтриването, ако public.games има редове, освен с FORCE_DROP=1.
source "$(dirname "$0")/common.sh"
need "$ROOT/local/deploy/worker.pw"
PW="$(cat "$ROOT/local/deploy/worker.pw")"
DROP=0; has_drop_flag "$@" && DROP=1

echo "План:"
if test $DROP -eq 1; then
  echo "  - ИЗТРИВА public.guesses, games, duels, profiles, app_config, daily_numbers и схемата drizzle (всички данни!)"
  test "${FORCE_DROP:-}" = "1" && echo "  - FORCE_DROP=1: изтрива дори ако public.games има редове" \
    || echo "  - отказва, ако public.games има редове (FORCE_DROP=1 за насилствено)"
else
  echo "  - НЕ изтрива таблици (за това: $DROP_FLAG)"
fi
echo "  - създава ролята $WORKER_ROLE или сменя паролата ѝ; дава права върху схемата public"

GUARD="
do \$\$ declare has_rows boolean; begin
  if to_regclass('public.games') is not null then
    execute 'select exists (select 1 from public.games)' into has_rows;
    if has_rows then
      raise exception 'public.games has rows: refusing to drop (FORCE_DROP=1 to override)';
    end if;
  end if;
end \$\$;
"
DROPS="
drop table if exists public.guesses, public.games, public.duels, public.profiles, public.app_config, public.daily_numbers cascade;
drop schema if exists drizzle cascade;
"
ROLE="
do \$\$ begin
  if not exists (select 1 from pg_roles where rolname = '$WORKER_ROLE') then
    execute format('create role %I login password %L', '$WORKER_ROLE', '$PW');
  else
    execute format('alter role %I with login password %L', '$WORKER_ROLE', '$PW');
  end if;
end \$\$;
grant usage, create on schema public to $WORKER_ROLE;
grant create on database postgres to $WORKER_ROLE;
grant $WORKER_ROLE to postgres;
select rolname, rolcanlogin from pg_roles where rolname = '$WORKER_ROLE';
"
SQL="$ROLE"
if test $DROP -eq 1; then
  if test "${FORCE_DROP:-}" = "1"; then SQL="$DROPS$ROLE"; else SQL="$GUARD$DROPS$ROLE"; fi
fi
cd "$ROOT" && supabase db query --linked "$SQL" 2>&1 | sed "s#${PW}#***#g"
test $DROP -eq 1 && echo "OK: таблиците са изтрити; ролята $WORKER_ROLE е готова." \
  || echo "OK: ролята $WORKER_ROLE е готова (нищо не е изтрито)."
