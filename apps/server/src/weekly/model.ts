import {
  compareWeekly,
  levelFromXp,
  rankKeyForLevel,
  WEEKLY_GOLD_TOP,
  WEEKLY_WIN_XP,
} from '@bc/game-core'
import type { WeeklyBestDto, WeeklyRowDto } from '@bc/protocol'
import type { NewWeeklyResult, WeeklyPlayEntry } from '../ports/repo'

/** A ranked player: their best (won) game and their place, 1-based. */
export interface Placed {
  readonly entry: WeeklyPlayEntry
  readonly place: number
}

export interface Standings {
  /** Each participant's best game (a loss when they never won). */
  readonly best: ReadonlyMap<string, WeeklyPlayEntry>
  /** Winners only, best first: losses are recorded but never ranked. */
  readonly ranked: readonly Placed[]
  readonly participants: number
}

const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** A win, fewer attempts, less time; then whoever finished first; then the user id, so ties are stable. */
export function comparePlays(a: WeeklyPlayEntry, b: WeeklyPlayEntry): number {
  return (
    compareWeekly(a, b) ||
    (a.finishedAt ?? Number.MAX_SAFE_INTEGER) - (b.finishedAt ?? Number.MAX_SAFE_INTEGER) ||
    compareIds(a.userId, b.userId)
  )
}

/** Pure: the week's standings from its finished plays (any order). */
export function standings(plays: readonly WeeklyPlayEntry[]): Standings {
  const best = new Map<string, WeeklyPlayEntry>()
  for (const play of [...plays].sort(comparePlays)) {
    if (play.finishedAt !== null && !best.has(play.userId)) best.set(play.userId, play)
  }
  const ranked = [...best.values()]
    .filter((e) => e.won)
    .sort(comparePlays)
    .map((entry, i) => ({ entry, place: i + 1 }))
  return { best, ranked, participants: best.size }
}

export const placeOf = (s: Standings, userId: string): Placed | null =>
  s.ranked.find((p) => p.entry.userId === userId) ?? null

export const hasGoldFrame = (until: number | null, now: number): boolean =>
  until !== null && until > now

export function toBest(entry: WeeklyPlayEntry | undefined): WeeklyBestDto | null {
  return entry ? { won: entry.won, attempts: entry.attempts, secs: entry.secs } : null
}

export function toRow({ entry, place }: Placed, viewerId: string, now: number): WeeklyRowDto {
  const level = levelFromXp(entry.xp)
  return {
    rank: place,
    username: entry.username,
    attempts: entry.attempts,
    secs: entry.secs,
    you: entry.userId === viewerId,
    level,
    rankKey: rankKeyForLevel(level),
    avatarSpecies: entry.avatarSpecies,
    goldFrame: hasGoldFrame(entry.goldFrameUntil, now),
  }
}

/** What finalising stores per participant: +300 XP for a win, the gold frame for the top 10. */
export function resultsOf(s: Standings, weekId: string): NewWeeklyResult[] {
  return [...s.best.values()].map((entry) => {
    const placed = placeOf(s, entry.userId)
    return {
      weekId,
      userId: entry.userId,
      place: placed?.place ?? null,
      participants: s.participants,
      won: entry.won,
      attempts: entry.won ? entry.attempts : null,
      secs: entry.won ? entry.secs : null,
      xp: entry.won ? WEEKLY_WIN_XP : 0,
      goldFrame: placed !== null && placed.place <= WEEKLY_GOLD_TOP,
    }
  })
}
