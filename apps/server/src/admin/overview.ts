import { levelFromXp, sofiaDate } from '@bc/game-core'
import type { AdminDayDto, AdminKindDto, AdminOverviewDto } from '@bc/protocol'
import type { Clock } from '../ports/clock'
import type { AdminKindRow, Repo } from '../ports/repo'

const DAY_MS = 86_400_000
/** The chart covers the last 30 Sofia days, today included. */
export const ADMIN_DAYS = 30
export const ADMIN_RECENT_USERS = 50

/** Sofia dates of the last `count` days, oldest first. Noon steps avoid DST edges. */
export function lastDays(now: number, count: number): string[] {
  const today = sofiaDate(new Date(now))
  const noon = Date.parse(`${today}T12:00:00Z`)
  return Array.from({ length: count }, (_, i) => sofiaDate(new Date(noon - (count - 1 - i) * DAY_MS)))
}

const percent = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0)

const toKind = (k: AdminKindRow): AdminKindDto => ({
  kind: k.kind,
  total: k.total,
  finished: k.finished,
  won: k.won,
  winRate: percent(k.won, k.finished),
  avgAttempts: k.won > 0 ? Math.round((k.wonAttempts / k.won) * 10) / 10 : null,
})

export interface AdminDeps {
  readonly repo: Repo
  readonly clock: Clock
}

/** Everything `/admin` shows, in one read. */
export async function adminOverview({ repo, clock }: AdminDeps): Promise<AdminOverviewDto> {
  const now = clock.now()
  const days = lastDays(now, ADMIN_DAYS)
  const rows = await repo.admin.overview({ now, days, recentLimit: ADMIN_RECENT_USERS })
  const byDate = new Map(rows.days.map((d) => [d.date, d]))
  const dayDtos: AdminDayDto[] = days.map(
    (date) => byDate.get(date) ?? { date, newUsers: 0, activeUsers: 0, games: 0 },
  )
  const sum = (pick: (k: AdminKindRow) => number) => rows.kinds.reduce((acc, k) => acc + pick(k), 0)
  return {
    generatedAt: now,
    users: { ...rows.users, members: rows.users.total - rows.users.guests },
    days: dayDtos,
    games: { total: sum((k) => k.total), finished: sum((k) => k.finished), won: sum((k) => k.won) },
    kinds: [...rows.kinds].sort((a, b) => b.total - a.total).map(toKind),
    social: rows.social,
    recentUsers: rows.recentUsers.map(({ xp, ...u }) => ({ ...u, level: levelFromXp(xp) })),
  }
}
