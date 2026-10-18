-- Бикове и крави: схема, права и игрови функции.
-- Принцип: тайното число никога не напуска сървъра. Клиентът вижда само
-- резултата от всяка проверка, а класирането се чете от изгледи.

create extension if not exists pgcrypto;

-- ---------- профили ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by all" on public.profiles for select using (true);
create policy "profiles editable by owner" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Играч'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- конфигурация, недостъпна през API ----------
create table public.app_config (key text primary key, value text not null);
alter table public.app_config enable row level security;
insert into public.app_config (key, value) values ('daily_salt', encode(gen_random_bytes(16), 'hex'));

-- ---------- дуели ----------
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  len int not null check (len between 3 and 5),
  secret text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  winner_id uuid references auth.users(id) on delete set null,
  winner_tries int,
  created_at timestamptz not null default now()
);
alter table public.duels enable row level security;
-- Без политики: достъп само през функциите по-долу.

-- ---------- игри и опити ----------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  len int not null check (len between 3 and 5),
  secret text not null,
  daily_date date,
  duel_id uuid references public.duels(id) on delete set null,
  tries int not null default 0,
  penalty int not null default 0,
  known jsonb not null default '{}'::jsonb,
  won boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score int
);
create index games_user_idx on public.games (user_id);
create index games_daily_idx on public.games (daily_date) where won;
alter table public.games enable row level security;
create policy "own games" on public.games for select using (auth.uid() = user_id);
-- Колоната secret не се дава на API ролите дори за собствените редове.
revoke all on public.games from anon, authenticated;
grant select (id, user_id, len, daily_date, duel_id, tries, penalty, known, won, started_at, finished_at, score)
  on public.games to authenticated;

create table public.guesses (
  id bigserial primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  guess text not null,
  bulls int not null,
  cows int not null,
  created_at timestamptz not null default now()
);
create index guesses_game_idx on public.guesses (game_id);
alter table public.guesses enable row level security;
create policy "own guesses" on public.guesses for select
  using (exists (select 1 from public.games g where g.id = game_id and g.user_id = auth.uid()));

-- ---------- помощни функции ----------
create or replace function public.is_valid_code(s text, n int) returns boolean
language sql immutable as $$
  select length(s) = n
     and s ~ '^[1-9][0-9]*$'
     and (select count(distinct c) from regexp_split_to_table(s, '') as c) = n
$$;

create or replace function public.random_code(n int) returns text
language plpgsql volatile as $$
declare d int[] := array[0,1,2,3,4,5,6,7,8,9]; i int; j int; t int; k int;
begin
  for i in reverse 10..2 loop
    j := 1 + floor(random() * i)::int;
    t := d[i]; d[i] := d[j]; d[j] := t;
  end loop;
  if d[1] = 0 then
    for k in 2..10 loop
      if d[k] <> 0 then t := d[1]; d[1] := d[k]; d[k] := t; exit; end if;
    end loop;
  end if;
  return array_to_string(d[1:n], '');
end $$;

-- Числото на деня: еднакво за всички, но непредвидимо благодарение на солта.
create or replace function public.daily_secret(n int, d date) returns text
language plpgsql stable security definer set search_path = public as $$
declare h text; salt text; digits int[] := array[0,1,2,3,4,5,6,7,8,9]; i int; j int; t int; k int;
begin
  select value into salt from app_config where key = 'daily_salt';
  h := encode(digest(d::text || ':' || n || ':' || coalesce(salt, ''), 'sha256'), 'hex');
  for i in reverse 10..2 loop
    j := 1 + (('x' || substr(h, (i - 1) * 4 + 1, 4))::bit(16)::int % i);
    t := digits[i]; digits[i] := digits[j]; digits[j] := t;
  end loop;
  if digits[1] = 0 then
    for k in 2..10 loop
      if digits[k] <> 0 then t := digits[1]; digits[1] := digits[k]; digits[k] := t; exit; end if;
    end loop;
  end if;
  return array_to_string(digits[1:n], '');
end $$;

-- Същата формула като computeScore() в src/game/logic.ts.
create or replace function public.compute_score(n int, tries int, ms bigint) returns int
language sql immutable as $$
  select round(
    (case n when 3 then 600 when 4 then 1000 else 1500 end)
    * least(1.5, (case n when 3 then 4 when 4 then 6 else 7 end)::numeric / greatest(1, tries))
    * (1 + greatest(0, 1 - ms / 1000.0 / 300) * 0.25)
  )::int
$$;

-- ---------- игрови функции (security definer: единственият път до secret) ----------
create or replace function public.new_game(p_len int, p_daily boolean default false) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid uuid; s text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_len not between 3 and 5 then raise exception 'bad length'; end if;
  s := case when p_daily then daily_secret(p_len, current_date) else random_code(p_len) end;
  insert into games (user_id, len, secret, daily_date)
  values (uid, p_len, s, case when p_daily then current_date end)
  returning id into gid;
  return gid;
end $$;

create or replace function public.make_guess(p_game uuid, p_guess text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g games%rowtype; b int := 0; c int := 0; i int; ms bigint; sc int; w boolean; ch text;
begin
  select * into g from games where id = p_game and user_id = auth.uid() for update;
  if not found then raise exception 'game not found'; end if;
  if g.finished_at is not null then raise exception 'game finished'; end if;
  if not is_valid_code(p_guess, g.len) then raise exception 'invalid guess'; end if;
  if exists (select 1 from guesses where game_id = g.id and guess = p_guess) then raise exception 'repeated guess'; end if;

  for i in 1..g.len loop
    ch := substr(p_guess, i, 1);
    if ch = substr(g.secret, i, 1) then b := b + 1;
    elsif position(ch in g.secret) > 0 then c := c + 1;
    end if;
  end loop;

  insert into guesses (game_id, guess, bulls, cows) values (g.id, p_guess, b, c);
  update games set tries = tries + 1 where id = g.id returning tries into g.tries;
  w := (b = g.len);
  if w then
    ms := (extract(epoch from (now() - g.started_at)) * 1000)::bigint;
    sc := compute_score(g.len, g.tries + g.penalty, ms);
    update games set won = true, finished_at = now(), score = sc where id = g.id;
    if g.duel_id is not null then
      update duels set winner_id = auth.uid(), winner_tries = g.tries
      where id = g.duel_id and winner_id is null;
    end if;
  end if;
  return jsonb_build_object('bulls', b, 'cows', c, 'won', w, 'tries', g.tries, 'score', sc, 'ms', ms);
end $$;

create or replace function public.use_hint(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g games%rowtype; free int[] := '{}'; i int; pos int;
begin
  select * into g from games where id = p_game and user_id = auth.uid() for update;
  if not found then raise exception 'game not found'; end if;
  if g.finished_at is not null then raise exception 'game finished'; end if;
  if g.duel_id is not null then raise exception 'no hints in duel'; end if;
  for i in 1..g.len loop
    if not (g.known ? i::text) then free := free || i; end if;
  end loop;
  if coalesce(array_length(free, 1), 0) = 0 then raise exception 'no more hints'; end if;
  pos := free[1 + floor(random() * array_length(free, 1))::int];
  update games
     set penalty = penalty + 2,
         known = known || jsonb_build_object(pos::text, substr(g.secret, pos, 1))
   where id = g.id;
  return jsonb_build_object('pos', pos, 'digit', substr(g.secret, pos, 1));
end $$;

create or replace function public.give_up(p_game uuid) returns text
language plpgsql security definer set search_path = public as $$
declare s text;
begin
  update games set finished_at = now()
   where id = p_game and user_id = auth.uid() and finished_at is null
   returning secret into s;
  if s is null then raise exception 'game not found'; end if;
  return s;
end $$;

-- ---------- дуели ----------
create or replace function public.create_duel(p_len int) returns text
language plpgsql security definer set search_path = public as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; i int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_len not between 3 and 5 then raise exception 'bad length'; end if;
  loop
    code := '';
    for i in 1..4 loop
      code := code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    end loop;
    begin
      insert into duels (code, len, secret, created_by) values (code, p_len, random_code(p_len), auth.uid());
      return code;
    exception when unique_violation then
      null; -- опитай с друг код
    end;
  end loop;
end $$;

create or replace function public.join_duel(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d duels%rowtype; gid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into d from duels where code = upper(p_code) and created_at > now() - interval '1 day';
  if not found then raise exception 'duel not found'; end if;
  select id into gid from games where duel_id = d.id and user_id = auth.uid();
  if gid is null then
    insert into games (user_id, len, secret, duel_id) values (auth.uid(), d.len, d.secret, d.id) returning id into gid;
  end if;
  return jsonb_build_object('game_id', gid, 'len', d.len, 'duel_id', d.id, 'winner_id', d.winner_id);
end $$;

-- ---------- класиране ----------
-- Изгледите са собственост на postgres и заобикалят RLS, но показват само
-- агрегирани колони без тайни числа.
create or replace view public.leaderboard_daily as
select distinct on (g.daily_date, g.user_id)
  g.daily_date,
  g.user_id,
  p.username,
  p.avatar_url,
  g.score,
  g.tries + g.penalty as tries,
  (extract(epoch from (g.finished_at - g.started_at)) * 1000)::bigint as ms
from public.games g
join public.profiles p on p.id = g.user_id
where g.won and g.daily_date is not null
order by g.daily_date, g.user_id, g.score desc;

create or replace view public.leaderboard_total as
select
  p.id as user_id,
  p.username,
  p.avatar_url,
  coalesce(sum(g.score) filter (where g.won and g.duel_id is null), 0)::int as total,
  count(g.id) filter (where g.won and g.duel_id is null)::int as wins,
  count(g.id) filter (where g.duel_id is null and g.finished_at is not null)::int as games,
  count(g.id) filter (where g.duel_id is not null and d.winner_id = p.id)::int as duel_wins,
  max(g.score) filter (where g.won and g.duel_id is null) as best
from public.profiles p
left join public.games g on g.user_id = p.id
left join public.duels d on d.id = g.duel_id
group by p.id, p.username, p.avatar_url;

grant select on public.leaderboard_daily, public.leaderboard_total to anon, authenticated;
grant execute on function public.new_game, public.make_guess, public.use_hint, public.give_up,
  public.create_duel, public.join_duel to authenticated;
