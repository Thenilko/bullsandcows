#!/usr/bin/env bash
# Стъпка 1: изтрива старите тестови таблици и създава ролята за Worker-а (паролата е в local/deploy/worker.pw).
source "$(dirname "$0")/common.sh"
need "$ROOT/local/deploy/worker.pw"
PW="$(cat "$ROOT/local/deploy/worker.pw")"
SQL="
drop table if exists public.guesses, public.games, public.duels, public.profiles, public.app_config, public.daily_numbers cascade;
drop schema if exists drizzle cascade;
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
cd "$ROOT" && supabase db query --linked "$SQL"
echo "OK: ролята $WORKER_ROLE е готова; старите таблици са изтрити."
