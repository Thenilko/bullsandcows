import type { AvatarSpecies } from '@bc/protocol'
import { sql, type SQL } from 'drizzle-orm'
import {
  LEADERBOARD_LIMIT,
  type BoardEntry,
  type BoardRepoQuery,
  type BoardsRepo,
} from '../../../ports/repo'
import type { Db } from './client'

type Row = Record<string, unknown>

/** Ids reach the uuid casts; anything else would make Postgres reject the query. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Postgres returns bigint counts as strings. */
const num = (value: unknown): number => Number(value ?? 0)
const opt = (value: unknown): number | undefined =>
  value === null || value === undefined ? undefined : Number(value)
const ms = (value: unknown): number | null =>
  value === null || value === undefined ? null : new Date(value as string | Date).getTime()

/** The profile columns every board shows; `p` is the profile, members only. */
const PROFILE_COLS = sql`p.id as user_id, p.username, p.xp, p.avatar_species, p.gold_frame_until, p.last_seen_at`

/** A finished duel between two human seats (alias `d`). */
const HUMAN_DUEL = sql`d.finished_at is not null and d.opponent_kind <> 'bot'
  and d.player_a is not null and d.player_b is not null`

function duels(): SQL {
  return sql`
    select ${PROFILE_COLS}, p.rating as value, null::int as best, r.wins, r.losses, r.draws,
           row_number() over (order by p.rating desc, p.id) as rn
    from (
      select s.uid,
             count(*) filter (where s.winner = s.uid) as wins,
             count(*) filter (where s.winner is not null and s.winner <> s.uid) as losses,
             count(*) filter (where s.winner is null) as draws
      from (
        select d.player_a as uid, d.winner from duels d where ${HUMAN_DUEL}
        union all
        select d.player_b as uid, d.winner from duels d where ${HUMAN_DUEL}
      ) s
      group by s.uid
    ) r
    join profiles p on p.id = r.uid
    where not p.is_guest`
}

function streaks(liveFrom: string): SQL {
  return sql`
    select ${PROFILE_COLS}, p.current_streak as value, p.best_streak as best,
           null::int as wins, null::int as losses, null::int as draws,
           row_number() over (order by p.current_streak desc, p.best_streak desc, p.id) as rn
    from profiles p
    where not p.is_guest and p.current_streak > 0 and p.streak_date >= ${liveFrom}::date`
}

function herders(): SQL {
  return sql`
    select ${PROFILE_COLS}, p.xp as value, null::int as best,
           null::int as wins, null::int as losses, null::int as draws,
           row_number() over (order by p.xp desc, p.id) as rn
    from profiles p
    where not p.is_guest and p.xp > 0`
}

function games(sinceMs: number): SQL {
  const since = sql`${new Date(sinceMs).toISOString()}::timestamptz`
  return sql`
    select ${PROFILE_COLS}, c.n as value, null::int as best,
           null::int as wins, null::int as losses, null::int as draws,
           row_number() over (order by c.n desc, c.last asc, p.id) as rn
    from (
      select g.user_id, count(*) as n, max(g.finished_at) as last
      from games g
      where g.finished_at >= ${since} and not g.practice
        and g.kind in ('daily', 'free', 'duel_race', 'duel_classic', 'bot')
      group by g.user_id
    ) c
    join profiles p on p.id = c.user_id
    where not p.is_guest`
}

function friends(viewer: string): SQL {
  const me = sql`${viewer}::uuid`
  return sql`
    select ${PROFILE_COLS}, p.xp as value, null::int as best, h.wins, h.losses, h.draws,
           row_number() over (order by p.xp desc, p.id) as rn
    from (
      select ${me} as uid, null::bigint as wins, null::bigint as losses, null::bigint as draws
      union all
      select case when d.player_a = ${me} then d.player_b else d.player_a end as uid,
             count(*) filter (where d.winner = ${me}),
             count(*) filter (where d.winner is not null and d.winner <> ${me}),
             count(*) filter (where d.winner is null)
      from duels d
      where ${HUMAN_DUEL} and d.player_a <> d.player_b
        and (d.player_a = ${me} or d.player_b = ${me})
      group by 1
    ) h
    join profiles p on p.id = h.uid
    where not p.is_guest`
}

function rankedOf(q: BoardRepoQuery): SQL {
  switch (q.kind) {
    case 'duels':
      return duels()
    case 'streaks':
      return streaks(q.liveFrom)
    case 'herders':
      return herders()
    case 'games':
      return games(q.sinceMs)
    case 'friends':
      return friends(q.viewer)
  }
}

function toEntry(r: Row): BoardEntry {
  const extra = { best: opt(r.best), wins: opt(r.wins), losses: opt(r.losses), draws: opt(r.draws) }
  return {
    userId: String(r.user_id),
    username: String(r.username),
    xp: num(r.xp),
    avatarSpecies: r.avatar_species as AvatarSpecies,
    goldFrameUntil: ms(r.gold_frame_until),
    lastSeenAt: ms(r.last_seen_at),
    value: num(r.value),
    ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined)),
  }
}

export function drizzleBoards(db: Db): BoardsRepo {
  const rows = async (query: SQL): Promise<Row[]> => (await db.execute(query)) as unknown as Row[]
  const valid = (q: BoardRepoQuery) => q.kind !== 'friends' || UUID.test(q.viewer)
  return {
    top: async (q) => {
      if (!valid(q)) return []
      const list = await rows(
        sql`select * from (${rankedOf(q)}) b order by b.rn limit ${LEADERBOARD_LIMIT}`,
      )
      return list.map(toEntry)
    },
    placeOf: async (q, userId) => {
      if (!valid(q) || !UUID.test(userId)) return null
      const [hit] = await rows(
        sql`select b.rn, b.value from (${rankedOf(q)}) b where b.user_id = ${userId}::uuid limit 1`,
      )
      return hit ? { rank: num(hit.rn), value: num(hit.value) } : null
    },
  }
}
