import { sql } from 'drizzle-orm'
import type {
  AdminDay,
  AdminKindRow,
  AdminRepo,
  AdminUserRow,
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

export function drizzleAdmin(db: Db): AdminRepo {
  const rows = async (query: ReturnType<typeof sql>): Promise<Row[]> =>
    (await db.execute(query)) as unknown as Row[]

  return {
    overview: async ({ now, days, recentLimit }) => {
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

      const recentRows = await rows(sql`
        select p.id, p.username, p.email, p.is_guest, p.xp, p.created_at,
               count(g.id) as games, max(g.created_at) as last_game_at
        from profiles p left join games g on g.user_id = p.id
        group by p.id
        order by max(g.created_at) desc nulls last, p.created_at desc
        limit ${recentLimit}`)

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

      const recentUsers: AdminUserRow[] = recentRows.map((r) => ({
        id: String(r.id),
        username: String(r.username),
        email: (r.email as string | null) ?? null,
        isGuest: r.is_guest === true,
        xp: n(r.xp),
        games: n(r.games),
        createdAt: ms(r.created_at) ?? 0,
        lastGameAt: ms(r.last_game_at),
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
        recentUsers,
      }
    },
  }
}
