import type { FarmTodayDto } from '@bc/protocol'
import type { PublicGameRow } from '../ports/repo'

const DAY_MS = 86_400_000
const MS_PER_SEC = 1000

/** Monday of the ISO week of a Sofia date 'YYYY-MM-DD' (dates are plain calendar days, so UTC arithmetic). */
export function weekMonday(date: string): string {
  const ms = Date.parse(`${date}T00:00:00Z`)
  const weekday = (new Date(ms).getUTCDay() + 6) % 7
  return new Date(ms - weekday * DAY_MS).toISOString().slice(0, 10)
}

const secsOf = (g: PublicGameRow): number | null =>
  g.startedAt === null || g.finishedAt === null
    ? null
    : Math.round((g.finishedAt - g.startedAt) / MS_PER_SEC)

const todayOf = (g: PublicGameRow): FarmTodayDto => ({
  attempts: g.attempts,
  secs: secsOf(g),
  won: g.won === true,
})

/** Better first: a win, then fewer attempts, then less time (unknown time last). */
export function compareToday(a: FarmTodayDto, b: FarmTodayDto): number {
  if (a.won !== b.won) return a.won ? -1 : 1
  if (a.attempts !== b.attempts) return a.attempts - b.attempts
  return (a.secs ?? Number.MAX_SAFE_INTEGER) - (b.secs ?? Number.MAX_SAFE_INTEGER)
}

/** The player's best counted number of the day on `date` (any settings), or null when not played. */
export function bestToday(games: readonly PublicGameRow[], date: string): FarmTodayDto | null {
  const played = games
    .filter((g) => g.dailyDate === date && g.finishedAt !== null)
    .map(todayOf)
    .sort(compareToday)
  return played[0] ?? null
}

/** Sum of the scores of the counted numbers of the day from `monday` on. */
export function weekPoints(games: readonly PublicGameRow[], monday: string): number {
  return games
    .filter((g) => g.dailyDate !== null && g.dailyDate >= monday && g.finishedAt !== null)
    .reduce((sum, g) => sum + g.score, 0)
}

export type FarmAction = 'rename' | 'newCode' | 'remove' | 'leave' | 'nudge' | 'view'

/** Who may do what in a farm: the owner everything, a member viewing, nudging and leaving. */
export function mayDo(role: 'owner' | 'member', action: FarmAction): boolean {
  if (role === 'owner') return true
  return action === 'view' || action === 'nudge' || action === 'leave'
}
