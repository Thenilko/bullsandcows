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

export function rankKeyForStars(stars: Stars): (typeof RANK_KEYS)[number] {
  return RANK_KEYS[stars]
}

export function rankKeyForLevel(level: number): (typeof RANK_KEYS)[number] {
  return RANK_KEYS[Math.min(5, Math.max(0, level))]
}

export const XP_PER_LEVEL = 1500

export function levelFromXp(xp: number): number {
  return 1 + Math.floor(xp / XP_PER_LEVEL)
}

export function xpIntoLevel(xp: number): number {
  return xp % XP_PER_LEVEL
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
