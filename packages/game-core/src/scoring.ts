import type { Len } from './codes'

export const LEN_FACTOR: Readonly<Record<Len, number>> = { 3: 0.8, 4: 1, 5: 1.3 }

const BASE_SCORE = 1200
const ATTEMPT_PENALTY = 90
const SECOND_PENALTY = 1.5
const MIN_SCORE = 50

export function scoreSolo(attempts: number, secs: number, len: Len): number {
  const raw = BASE_SCORE - (attempts - 1) * ATTEMPT_PENALTY - secs * SECOND_PENALTY
  return Math.max(MIN_SCORE, Math.round(raw * LEN_FACTOR[len]))
}

export type Stars = 0 | 1 | 2 | 3 | 4 | 5

/** `top` is a percentage; only 1..5 stars are ever awarded here. */
export function starsFromTop(top: number): Stars {
  if (top <= 5) return 5
  if (top <= 20) return 4
  if (top <= 45) return 3
  if (top <= 75) return 2
  return 1
}

export const RANK_KEYS = ['calf', 'herdsman', 'shepherd', 'pastor', 'steward', 'chiefBull'] as const
export type RankKey = (typeof RANK_KEYS)[number]

/** The title of one game's result: 0 stars is a calf, 5 a chief bull. */
export function rankKeyForStars(stars: Stars): RankKey {
  return RANK_KEYS[stars]
}

const RANK_LEVELS = [
  { from: 35, key: 'chiefBull' },
  { from: 20, key: 'steward' },
  { from: 10, key: 'pastor' },
  { from: 5, key: 'shepherd' },
] as const satisfies readonly { from: number; key: RankKey }[]

/** Title by level: 1–4 herdsman, 5–9 shepherd, 10–19 pastor, 20–34 steward, 35+ chief bull. */
export function rankKeyForLevel(level: number): RankKey {
  return RANK_LEVELS.find((r) => level >= r.from)?.key ?? 'herdsman'
}

/** Guests are calves whatever their level. */
export function rankKeyForGuest(): RankKey {
  return 'calf'
}

const LEVEL_BASE_COST = 500
const LEVEL_COST_STEP = 250

/** XP needed to go from `level` to the next one: 500, 750, 1000, ... (no cap). */
export function xpForNextLevel(level: number): number {
  return LEVEL_BASE_COST + LEVEL_COST_STEP * (level - 1)
}

/** Total XP at which `level` is reached: 500·(n−1) + 125·(n−1)·(n−2) = 125·(n−1)·(n+2). */
export function xpForLevel(level: number): number {
  return (LEVEL_COST_STEP / 2) * (level - 1) * (level + 2)
}

/** The highest level whose threshold is at most `xp`. */
export function levelFromXp(xp: number): number {
  // Solve 125·(n−1)·(n+2) ≤ xp for n, then settle any rounding exactly at the boundary.
  const estimate = Math.floor((-1 + Math.sqrt(9 + (4 * xp) / (LEVEL_COST_STEP / 2))) / 2)
  let level = Math.max(1, estimate)
  while (xpForLevel(level + 1) <= xp) level += 1
  while (level > 1 && xpForLevel(level) > xp) level -= 1
  return level
}

export function xpIntoLevel(xp: number): number {
  return xp - xpForLevel(levelFromXp(xp))
}

export const DUEL_XP = { win: 120, draw: 70, lose: 40 } as const
export const BOT_WIN_XP = 40

export type Outcome = 'win' | 'draw' | 'lose'

/** Bots grant XP only for a win against level 3 or 4. */
export function duelXp(
  outcome: Outcome,
  opponentKind: 'quick' | 'friend' | 'bot',
  botLevel?: 1 | 2 | 3 | 4,
): number {
  if (opponentKind !== 'bot') return DUEL_XP[outcome]
  return outcome === 'win' && botLevel !== undefined && botLevel >= 3 ? BOT_WIN_XP : 0
}
