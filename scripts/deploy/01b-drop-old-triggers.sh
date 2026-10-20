#!/usr/bin/env bash
# Стъпка 1b (еднократно): маха тригера и функциите на старото тестово приложение от auth.users / public.
# Изисква --i-know-this-drops-everything; без него само показва плана.
source "$(dirname "$0")/common.sh"
echo "План: маха тригера on_auth_user_created от auth.users и функциите на старото приложение в public"
echo "      (handle_new_user, is_valid_code, random_code, daily_secret, compute_score, new_game,"
echo "       make_guess, use_hint, give_up, create_duel, join_duel)."
has_drop_flag "$@" || { echo "Нищо не е направено. Пусни отново с $DROP_FLAG, за да изпълниш плана."; exit 1; }
SQL="
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_valid_code(s text, n int) cascade;
drop function if exists public.random_code(n int) cascade;
drop function if exists public.daily_secret(n int, d date) cascade;
drop function if exists public.compute_score(n int, tries int, ms bigint) cascade;
drop function if exists public.new_game(p_len int, p_daily boolean) cascade;
drop function if exists public.make_guess(p_game uuid, p_guess text) cascade;
drop function if exists public.use_hint(p_game uuid) cascade;
drop function if exists public.give_up(p_game uuid) cascade;
drop function if exists public.create_duel(p_len int) cascade;
drop function if exists public.join_duel(p_code text) cascade;
select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
"
cd "$ROOT" && supabase db query --linked "$SQL"
echo "OK: старите тригери/функции са премахнати (горната таблица трябва да е празна или без on_auth_user_created)."
