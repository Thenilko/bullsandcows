import type { BadgeKey } from '@bc/protocol'
import type { PublicGameRow } from '../ports/repo'

export type { BadgeKey } from '@bc/protocol'

const STREAK_BADGE = 7
const QUICK_WIN_MS = 60_000
const CHIEF_TOP_PERCENT = 5
const HARD_LEN = 5

type Game = Pick<PublicGameRow, 'won' | 'wasted' | 'len' | 'startedAt' | 'finishedAt' | 'attempts'>

const durationMs = (g: Game): number | null =>
  g.startedAt === null || g.finishedAt === null ? null : g.finishedAt - g.startedAt

/** Consecutive wins counting back from the most recent game; `history` is newest first. */
export function streakOf(history: readonly Pick<Game, 'won'>[]): number {
  const firstMiss = history.findIndex((g) => g.won !== true)
  return firstMiss === -1 ? history.length : firstMiss
}

/** Port of the prototype's badges (PasMobile): each one is "some win such that ...". */
export function badgesFor<G extends Game>(
  history: readonly G[],
  streak: number,
  topOfGame: (g: G) => number,
): Readonly<Record<BadgeKey, boolean>> {
  const wins = history.filter((g) => g.won === true)
  const quick = (g: G) => {
    const ms = durationMs(g)
    return ms !== null && ms < QUICK_WIN_MS
  }
  return {
    firstBull: wins.length > 0,
    noWaste: wins.some((g) => g.wasted === 0),
    underMinute: wins.some(quick),
    streak7: streak >= STREAK_BADGE,
    chiefBull: wins.some((g) => topOfGame(g) <= CHIEF_TOP_PERCENT),
    fiveDigits: wins.some((g) => g.len === HARD_LEN),
  }
}
