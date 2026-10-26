import { badgeDef, type BadgeKey, type Len } from '@bc/game-core'
import type { GameKind } from '../ports/repo'

/**
 * Pure metrics behind the 29 badges (docs/PROGRESSION.md): `badgeProgress(key, facts)` turns
 * the facts of one player into the badge's progress; the service compares it with the tier
 * thresholds. Facts are gathered per event by `badgeService.ts`.
 */

/** One counted (non-practice), finished game of any kind. */
export interface GameFact {
  readonly kind: GameKind
  readonly len: Len
  readonly zero: boolean
  readonly won: boolean
  readonly attempts: number
  readonly wasted: number
  /** Null when the start is unknown. */
  readonly durationMs: number | null
  /** Sofia wall-clock hour (0–23) of the finish. */
  readonly hourSofia: number
  readonly dailyDate: string | null
  readonly usedNotes: boolean
}

/** One finished duel or bot match of the player; `won` is the player's own outcome. */
export interface DuelFact {
  readonly vsHuman: boolean
  readonly won: boolean
  readonly botLevel: number | null
  readonly isRematch: boolean
  /** The player won after the opponent had exactly one candidate left. */
  readonly comeback: boolean
}

/** Things only the guesses and the secret of a game reveal; seen once, kept for good. */
export type BadgeEvent = Extract<BadgeKey, 'allCows' | 'mirror' | 'ladder' | 'zeroHero'>

export interface BadgeFacts {
  readonly games: readonly GameFact[]
  readonly bestDayStreak: number
  /** Oldest first. */
  readonly duels: readonly DuelFact[]
  readonly shares: number
  readonly events: readonly BadgeEvent[]
}

export const EMPTY_FACTS: BadgeFacts = {
  games: [],
  bestDayStreak: 0,
  duels: [],
  shares: 0,
  events: [],
}

const UNDER_MINUTE_MS = 60_000
const BOLT_MS = 30_000
const SHERLOCK_LEN = 4
const SHERLOCK_ATTEMPTS = 4
const LUCKY_ATTEMPTS = 2
const HARD_LEN = 5
const EARLY_BEFORE_HOUR = 8
const NIGHT_FROM_HOUR = 22
/** A „100% logic“ game needs at least this many guesses to mean anything. */
const PURE_MIN_ATTEMPTS = 2
const DATE_MONTH_LENGTH = 7

const isSolo = (g: GameFact): boolean => g.kind === 'daily' || g.kind === 'free'
const isDailyWin = (g: GameFact): boolean => g.kind === 'daily' && g.won
const quicker = (g: GameFact, ms: number): boolean =>
  g.won && g.durationMs !== null && g.durationMs < ms

const countWins = (facts: BadgeFacts, test: (g: GameFact) => boolean): number =>
  facts.games.filter((g) => g.won && test(g)).length

const countDuels = (facts: BadgeFacts, test: (d: DuelFact) => boolean): number =>
  facts.duels.filter(test).length

const daysInMonth = (month: string): number => {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Calendar months (Sofia) with a won number of the day on every single day. */
export function completeMonths(dailyDates: Iterable<string>): string[] {
  const days = new Map<string, Set<string>>()
  for (const date of dailyDates) {
    const month = date.slice(0, DATE_MONTH_LENGTH)
    days.set(month, new Set([...(days.get(month) ?? []), date]))
  }
  return [...days].filter(([month, set]) => set.size >= daysInMonth(month)).map(([m]) => m)
}

/** The longest run of consecutive wins; a loss or a draw ends a run. */
export function longestWinRun(outcomes: readonly boolean[]): number {
  return outcomes.reduce<{ run: number; best: number }>(
    (acc, won) => {
      const run = won ? acc.run + 1 : 0
      return { run, best: Math.max(acc.best, run) }
    },
    { run: 0, best: 0 },
  ).best
}

const formatsWon = (facts: BadgeFacts): number =>
  new Set(facts.games.filter((g) => g.won).map((g) => `${g.len}${g.zero ? 'z' : 'n'}`)).size

const botWins = (facts: BadgeFacts, level: number): number =>
  countDuels(facts, (d) => !d.vsHuman && d.won && d.botLevel === level)

const eventSeen = (facts: BadgeFacts, event: BadgeEvent): number =>
  facts.events.includes(event) ? 1 : 0

const METRICS: Readonly<Record<BadgeKey, (facts: BadgeFacts) => number>> = {
  noWaste: (f) => countWins(f, (g) => g.wasted === 0),
  sherlock: (f) => countWins(f, (g) => g.len === SHERLOCK_LEN && g.attempts <= SHERLOCK_ATTEMPTS),
  allCows: (f) => eventSeen(f, 'allCows'),
  lucky: (f) => countWins(f, (g) => g.attempts <= LUCKY_ATTEMPTS),
  five: (f) => countWins(f, (g) => g.len === HARD_LEN),
  pure: (f) =>
    f.games.filter((g) => isSolo(g) && g.wasted === 0 && g.attempts >= PURE_MIN_ATTEMPTS).length,
  underMinute: (f) => countWins(f, (g) => quicker(g, UNDER_MINUTE_MS)),
  bolt: (f) => countWins(f, (g) => quicker(g, BOLT_MS)),
  streak: (f) => f.bestDayStreak,
  early: (f) => countWins(f, (g) => isDailyWin(g) && g.hourSofia < EARLY_BEFORE_HOUR),
  night: (f) => countWins(f, (g) => isDailyWin(g) && g.hourSofia >= NIGHT_FROM_HOUR),
  month: (f) =>
    completeMonths(
      f.games.flatMap((g) => (isDailyWin(g) && g.dailyDate !== null ? [g.dailyDate] : [])),
    ).length > 0
      ? 1
      : 0,
  duelist: (f) => countDuels(f, (d) => d.vsHuman && d.won),
  unbeaten: (f) => longestWinRun(f.duels.filter((d) => d.vsHuman).map((d) => d.won)),
  comeback: (f) => countDuels(f, (d) => d.won && d.comeback),
  rematch: (f) => countDuels(f, (d) => d.vsHuman && d.isRematch),
  bot1: (f) => botWins(f, 1),
  bot2: (f) => botWins(f, 2),
  bot3: (f) => botWins(f, 3),
  bot4: (f) => botWins(f, 4),
  formats: formatsWon,
  notes: (f) => f.games.filter((g) => g.usedNotes).length,
  invite: () => 0,
  family: () => 0,
  teller: (f) => f.shares,
  weekly: () => 0,
  mirror: (f) => eventSeen(f, 'mirror'),
  ladder: (f) => eventSeen(f, 'ladder'),
  zeroHero: (f) => eventSeen(f, 'zeroHero'),
}

/** The progress of one badge from the facts; always 0 for a badge that is not available yet. */
export function badgeProgress(key: BadgeKey, facts: BadgeFacts): number {
  if (!badgeDef(key).available) return 0
  return METRICS[key](facts)
}

export interface JudgedGuess {
  readonly guess: string
  readonly bulls: number
  readonly cows: number
}

const reversed = (s: string): string => [...s].reverse().join('')

/** Digits that go up or down by one from the first to the last ('0123', '9876'). */
export function isLadder(secret: string): boolean {
  const digits = [...secret].map(Number)
  const step = (digits[1] ?? 0) - (digits[0] ?? 0)
  if (step !== 1 && step !== -1) return false
  return digits.every((d, i) => i === 0 || d - (digits[i - 1] ?? 0) === step)
}

/** The one-off events of a finished game (`secret` is known once it ended). */
export function guessEvents(
  secret: string,
  guesses: readonly JudgedGuess[],
  len: Len,
  won: boolean,
): BadgeEvent[] {
  const checks: readonly (readonly [BadgeEvent, boolean])[] = [
    ['allCows', guesses.some((g) => g.bulls === 0 && g.cows === len)],
    ['mirror', guesses.some((g) => g.guess === reversed(secret))],
    ['ladder', won && isLadder(secret)],
    ['zeroHero', won && secret.startsWith('0')],
  ]
  return checks.filter(([, seen]) => seen).map(([event]) => event)
}
