import { BADGE_KEYS, type BadgeKey } from '@bc/protocol'
import type { PublicGameRow } from '../ports/repo'

export type { BadgeKey } from '@bc/protocol'

/** Consecutive Sofia days with a won number of the day that earn `streak7`. */
export const STREAK_BADGE_DAYS = 7
const QUICK_WIN_MS = 60_000
const CHIEF_TOP_PERCENT = 5
const HARD_LEN = 5

type Game = Pick<PublicGameRow, 'won' | 'wasted' | 'len' | 'startedAt' | 'finishedAt' | 'attempts'>

const durationMs = (g: Game): number | null =>
  g.startedAt === null || g.finishedAt === null ? null : g.finishedAt - g.startedAt

const isQuick = (g: Game): boolean => {
  const ms = durationMs(g)
  return ms !== null && ms < QUICK_WIN_MS
}

/** Consecutive wins counting back from the most recent game; `history` is newest first. */
export function streakOf(history: readonly Pick<Game, 'won'>[]): number {
  const firstMiss = history.findIndex((g) => g.won !== true)
  return firstMiss === -1 ? history.length : firstMiss
}

/** The badges one finished game earns, given its "top X%"; a loss earns none. */
export function earnedByGame(g: Game, top: number): BadgeKey[] {
  if (g.won !== true) return []
  const checks: readonly (readonly [BadgeKey, boolean])[] = [
    ['firstBull', true],
    ['noWaste', g.wasted === 0],
    ['underMinute', isQuick(g)],
    ['chiefBull', top <= CHIEF_TOP_PERCENT],
    ['fiveDigits', g.len === HARD_LEN],
  ]
  return checks.filter(([, earned]) => earned).map(([key]) => key)
}

export function earnedByDayStreak(days: number): BadgeKey[] {
  return days >= STREAK_BADGE_DAYS ? ['streak7'] : []
}

/** Every badge key, held or not, for the profile DTO. */
export function badgeMap(held: Iterable<BadgeKey>): Readonly<Record<BadgeKey, boolean>> {
  const set = new Set(held)
  return Object.fromEntries(BADGE_KEYS.map((k) => [k, set.has(k)])) as Record<BadgeKey, boolean>
}

/** Badges a whole history would have earned (the one-time backfill), as a map. */
export function badgesFor<G extends Game>(
  history: readonly G[],
  bestDayStreak: number,
  topOfGame: (g: G) => number,
): Readonly<Record<BadgeKey, boolean>> {
  const fromGames = history.flatMap((g) => earnedByGame(g, topOfGame(g)))
  return badgeMap([...fromGames, ...earnedByDayStreak(bestDayStreak)])
}
