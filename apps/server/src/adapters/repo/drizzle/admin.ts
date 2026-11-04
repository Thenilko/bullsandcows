import type { Len } from '@bc/game-core'
import type { Activity } from '@bc/protocol'
import { sql } from 'drizzle-orm'
import type {
  AdminDay,
  AdminGameRow,
  AdminKindRow,
  AdminRepo,
  AdminUserRow,
  DuelFormat,
  GameKind,
  OpponentKind,
} from '../../../ports/repo'
import type { Db } from './client'

const DAY_MS = 86_400_000
const SOFIA = 'Europe/Sofia'

type Row = Record<string, unknown>

/** Postgres returns bigint counts as strings. */
const n = (value: unknown): number => Number(value ?? 0)
const ms = (value: unknown): number | null =>
  value === null || value === undefined ? null : new Date(value as string | Date).getTime()
const str = (value: unknown): string | null => (value === null || value === undefined ? null : String(value))

/** Ids come from the URL; anything else would make Postgres reject the uuid cast. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A game with its player and, for a duel, the other seat (the duel row may name it as A or B). */
const GAME_SELECT = sql`
  select g.*, p.username,
         d.id as duel_id, d.format, d.opponent_kind, d.bot_level, d.outcome, d.is_rematch,
         op.id as opponent_id, op.username as opponent_name,
         case when d.game_a = g.id then d.game_b else d.game_a end as opponent_game_id
  from games g
  join profiles p on p.id = g.user_id
  left join duels d on d.game_a = g.id or d.game_b = g.id
  left join profiles op on op.id = case when d.game_a = g.id then d.player_b else d.player_a end`

function toAdminGame(r: Row): AdminGameRow {
  const opponentId = str(r.opponent_id)
  return {
    id: String(r.id),
    userId: String(r.user_id),
    kind: r.kind as GameKind,
    len: n(r.len) as Len,
    zero: r.zero === true,
    secret: String(r.secret),
    dailyDate: str(r.daily_date),
    practice: r.practice === true,
    startedAt: ms(r.started_at),
    finishedAt: ms(r.finished_at),
    attempts: n(r.attempts),
    wasted: n(r.wasted),
    won: r.won === null || r.won === undefined ? null : r.won === true,
    score: n(r.score),
    suspicious: r.suspicious === true,
    usedNotes: r.used_notes === true,
    createdAt: ms(r.created_at) ?? 0,
    username: String(r.username),
    duel:
      r.duel_id === null || r.duel_id === undefined
        ? null
        : {
            id: String(r.duel_id),
            format: r.format as DuelFormat,
            opponentKind: r.opponent_kind as OpponentKind,
            botLevel: r.bot_level === null ? null : n(r.bot_level),
            outcome: str(r.outcome),
            isRematch: r.is_rematch === true,
            opponent: opponentId ? { id: opponentId, username: String(r.opponent_name) } : null,
            opponentGameId: str(r.opponent_game_id),
          },
  }
}

export function drizzleAdmin(db: Db): AdminRepo {
  const rows = async (query: ReturnType<typeof sql>): Promise<Row[]> =>
    (await db.execute(query)) as unknown as Row[]

  return {
    games: async ({ limit, offset, userId }) => {
      if (userId !== null && !UUID.test(userId)) return []
      const only = userId === null ? sql`` : sql`where g.user_id = ${userId}::uuid`
      const found = await rows(sql`${GAME_SELECT} ${only}
        order by g.created_at desc, g.id desc limit ${limit} offset ${offset}`)
      return found.map(toAdminGame)
    },
    game: async (id) => {
      if (!UUID.test(id)) return null
      const [found] = await rows(sql`${GAME_SELECT} where g.id = ${id}::uuid`)
      return found ? toAdminGame(found) : null
    },
    userCount: async () => n((await rows(sql`select count(*) as total from profiles`))[0]?.total),
    users: async ({ limit, offset }) => {
      // Active = the latest of the last ping, the last game and sign-up (greatest() skips nulls).
      const found = await rows(sql`
        select p.id, p.username, p.email, p.is_guest, p.xp, p.created_at, p.last_seen_at,
               count(g.id) as games, max(g.created_at) as last_game_at,
               greatest(p.last_seen_at, max(g.created_at), p.created_at) as active_at
        from profiles p left join games g on g.user_id = p.id
        group by p.id
        order by active_at desc, p.id
        limit ${limit} offset ${offset}`)
      return found.map(
        (r): AdminUserRow => ({
          id: String(r.id),
          username: String(r.username),
          email: str(r.email),
          isGuest: r.is_guest === true,
          xp: n(r.xp),
          games: n(r.games),
          createdAt: ms(r.created_at) ?? 0,
          lastGameAt: ms(r.last_game_at),
          lastSeenAt: ms(r.last_seen_at),
          activeAt: ms(r.active_at) ?? 0,
        }),
      )
    },
    duelStats: async ({ since, maxGapMs }) => {
      const from = sql`${new Date(since).toISOString()}::timestamptz`
      const botRows = await rows(sql`
        select d.format, d.bot_level, count(*) as games,
               count(*) filter (where d.winner is not null and d.winner = d.player_a) as human_wins,
               count(*) filter (where d.winner is null) as no_winner,
               avg(g.attempts) as human_attempts
        from duels d left join games g on g.id = d.game_a
        where d.opponent_kind = 'bot' and d.finished_at is not null and d.created_at >= ${from}
        group by 1, 2 order by 1, 2`)
      const outcomeRows = await rows(sql`
        select format, opponent_kind, coalesce(outcome, 'unknown') as reason, count(*) as n
        from duels where finished_at is not null and created_at >= ${from}
        group by 1, 2, 3 order by 1, 2, 3`)
      // The first guess counts from the start; a gap of maxGapMs or more is a player who walked away.
      const thinkRows = await rows(sql`
        with gaps as (
          select ga.kind, ga.len, gs.at,
                 extract(epoch from gs.at - coalesce(
                   lag(gs.at) over (partition by gs.game_id order by gs.id), ga.started_at)) as secs
          from guesses gs join games ga on ga.id = gs.game_id)
        select case when kind in ('daily', 'free', 'weekly') then 'solo' else 'duel' end as scope, len,
               count(*) as moves,
               percentile_cont(0.5) within group (order by secs) as p50,
               percentile_cont(0.9) within group (order by secs) as p90
        from gaps
        where at >= ${from} and secs > 0 and secs < ${maxGapMs / 1000}
        group by 1, 2 order by 1, 2`)
      return {
        bot: botRows.map((r) => ({
          format: r.format as DuelFormat,
          level: n(r.bot_level),
          games: n(r.games),
          humanWins: n(r.human_wins),
          noWinner: n(r.no_winner),
          humanAttempts: r.human_attempts === null ? null : Number(r.human_attempts),
        })),
        outcomes: outcomeRows.map((r) => ({
          format: r.format as DuelFormat,
          opponentKind: r.opponent_kind as OpponentKind,
          reason: String(r.reason),
          count: n(r.n),
        })),
        think: thinkRows.map((r) => ({
          scope: r.scope === 'solo' ? ('solo' as const) : ('duel' as const),
          len: n(r.len),
          moves: n(r.moves),
          p50: Number(r.p50),
          p90: Number(r.p90),
        })),
      }
    },
    voidGame: async (id) => {
      if (!UUID.test(id)) return false
      const done = await rows(sql`
        update games set practice = true, score = 0
        where id = ${id}::uuid and kind in ('daily', 'free')
        returning id`)
      return done.length > 0
    },
    online: async ({ since, gameSince, limit }) => {
      const at = (value: number) => sql`${new Date(value).toISOString()}::timestamptz`
      const seen = await rows(sql`
        select p.id, p.username, p.is_guest, p.xp, p.last_activity, p.last_seen_at,
               (select g.id from games g
                where g.user_id = p.id and g.finished_at is null and g.created_at >= ${at(gameSince)}
                order by g.created_at desc limit 1) as game_id
        from profiles p
        where p.last_seen_at >= ${at(since)}
        order by p.last_seen_at desc
        limit ${limit}`)
      const openIds = seen.map((r) => str(r.game_id)).filter((id): id is string => id !== null)
      const open = openIds.length
        ? await rows(sql`${GAME_SELECT} where g.id in (${sql.join(openIds.map((id) => sql`${id}::uuid`), sql`, `)})`)
        : []
      const byId = new Map(open.map((r) => [String(r.id), toAdminGame(r)]))
      return seen.map((r) => ({
        id: String(r.id),
        username: String(r.username),
        isGuest: r.is_guest === true,
        xp: n(r.xp),
        activity: (str(r.last_activity) as Activity | null) ?? null,
        lastSeenAt: ms(r.last_seen_at) ?? 0,
        game: byId.get(String(r.game_id)) ?? null,
      }))
    },
    overview: async ({ now, days }) => {
      // ISO strings with a cast: raw `sql` params are not serialised from Date by postgres-js.
      const at = (back: number) => sql`${new Date(now - back).toISOString()}::timestamptz`
      const d1 = at(DAY_MS)
      const d7 = at(7 * DAY_MS)
      const d30 = at(30 * DAY_MS)

      const [users] = await rows(sql`
        select
          (select count(*) from profiles) as total,
          (select count(*) from profiles where is_guest) as guests,
          (select count(*) from profiles where created_at >= ${d7}) as new7d,
          (select count(*) from profiles where created_at >= ${d30}) as new30d,
          (select count(distinct user_id) from games where created_at >= ${d1}) as active1d,
          (select count(distinct user_id) from games where created_at >= ${d7}) as active7d,
          (select count(distinct user_id) from games where created_at >= ${d30}) as active30d`)

      const first = days[0]
      const dayRows = first
        ? await rows(sql`
            with g as (
              select (created_at at time zone ${SOFIA})::date::text as day,
                     count(*) as games, count(distinct user_id) as active
              from games where (created_at at time zone ${SOFIA})::date >= ${first}::date group by 1),
            p as (
              select (created_at at time zone ${SOFIA})::date::text as day, count(*) as new_users
              from profiles where (created_at at time zone ${SOFIA})::date >= ${first}::date group by 1)
            select coalesce(g.day, p.day) as day, coalesce(p.new_users, 0) as new_users,
                   coalesce(g.active, 0) as active, coalesce(g.games, 0) as games
            from g full join p on g.day = p.day order by 1`)
        : []

      const kindRows = await rows(sql`
        select kind, count(*) as total, count(finished_at) as finished,
               count(*) filter (where won) as won,
               coalesce(sum(attempts) filter (where won), 0) as won_attempts
        from games group by kind order by kind`)

      const [social] = await rows(sql`
        select
          (select count(*) from duels) as duels,
          (select count(*) from duels where created_at >= ${d7}) as duels7d,
          (select count(*) from duels where opponent_kind = 'quick') as quick,
          (select count(*) from duels where opponent_kind = 'friend') as friend,
          (select count(*) from duels where opponent_kind = 'bot') as bot,
          (select count(*) from farms) as farms,
          (select count(*) from farm_members) as farm_members,
          (select count(*) from shares) as shares,
          (select count(*) from nudges) as nudges,
          (select count(distinct user_id) from games where kind = 'weekly' and created_at >= ${d7})
            as weekly_players7d`)

      const wanted = new Set(days)
      const dayList: AdminDay[] = dayRows
        .filter((r) => wanted.has(String(r.day)))
        .map((r) => ({
          date: String(r.day),
          newUsers: n(r.new_users),
          activeUsers: n(r.active),
          games: n(r.games),
        }))

      const kinds: AdminKindRow[] = kindRows.map((r) => ({
        kind: r.kind as GameKind,
        total: n(r.total),
        finished: n(r.finished),
        won: n(r.won),
        wonAttempts: n(r.won_attempts),
      }))

      const byOpponent: Record<OpponentKind, number> = {
        quick: n(social?.quick),
        friend: n(social?.friend),
        bot: n(social?.bot),
      }

      return {
        users: {
          total: n(users?.total),
          guests: n(users?.guests),
          new7d: n(users?.new7d),
          new30d: n(users?.new30d),
          active1d: n(users?.active1d),
          active7d: n(users?.active7d),
          active30d: n(users?.active30d),
        },
        days: dayList,
        kinds,
        social: {
          duels: n(social?.duels),
          duels7d: n(social?.duels7d),
          duelsByOpponent: byOpponent,
          farms: n(social?.farms),
          farmMembers: n(social?.farm_members),
          shares: n(social?.shares),
          nudges: n(social?.nudges),
          weeklyPlayers7d: n(social?.weekly_players7d),
        },
      }
    },
  }
}
