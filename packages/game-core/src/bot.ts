import { codes, type Len } from './codes'
import { bullsCows } from './verdict'

export type BotLevel = 1 | 2 | 3 | 4
export type Rng = () => number

/** Base think time per level (index = level - 1). */
export const BOT_THINK_BASE = {
  race: [11000, 8500, 6500, 4500],
  classic: [3600, 3000, 2500, 2000],
} as const

export const BOT_LEVEL1_RANDOM_CHANCE = 0.35
export const BOT_MINIMAX = { 3: { k: 4, maxCands: 400 }, 4: { k: 10, maxCands: 900 } } as const

const MIN_POOL_FOR_MINIMAX = 2
const CLASSIC_JITTER = [-500, 700] as const
const RACE_JITTER = [-2000, 2500] as const

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]
}

function worstBucket(pool: readonly string[], guess: string): number {
  const buckets = new Map<number, number>()
  let worst = 0
  for (const candidate of pool) {
    const { bulls, cows } = bullsCows(candidate, guess)
    const key = bulls * 10 + cows
    const size = (buckets.get(key) ?? 0) + 1
    buckets.set(key, size)
    if (size > worst) worst = size
  }
  return worst
}

function minimaxGuess(pool: readonly string[], k: number, rng: Rng): string {
  let best = pool[0]
  let bestWorst = Infinity
  for (let i = 0; i < k; i++) {
    const guess = pick(pool, rng)
    const worst = worstBucket(pool, guess)
    if (worst < bestWorst) {
      bestWorst = worst
      best = guess
    }
  }
  return best
}

/**
 * Picks the bot's next guess. Order in which `rng` is consumed (tests rely on it):
 *  1. level 1 with prior guesses: one draw for the random-branch roll; if it fires,
 *     one more draw picks uniformly from all codes not yet guessed.
 *  2. level >= 3 with 2 < pool <= maxCands: `k` draws, each picking a probe from the pool.
 *  3. otherwise: one draw picking from the pool.
 */
export function botGuess(
  cands: readonly string[],
  guessed: readonly string[],
  level: BotLevel,
  len: Len,
  zero: boolean,
  rng: Rng = Math.random,
): string {
  const remaining = cands.filter((c) => !guessed.includes(c))
  const pool = remaining.length > 0 ? remaining : cands
  if (level === 1 && guessed.length > 0 && rng() < BOT_LEVEL1_RANDOM_CHANCE) {
    return pick(
      codes(len, zero).filter((c) => !guessed.includes(c)),
      rng,
    )
  }
  if (level === 3 || level === 4) {
    const { k, maxCands } = BOT_MINIMAX[level]
    if (pool.length > MIN_POOL_FOR_MINIMAX && pool.length <= maxCands) {
      return minimaxGuess(pool, k, rng)
    }
  }
  return pick(pool, rng)
}

function jitter([a, b]: readonly [number, number], rng: Rng): number {
  return a + Math.floor(rng() * (b - a + 1))
}

export function botThinkMs(level: BotLevel, classic: boolean, rng: Rng = Math.random): number {
  if (classic) return BOT_THINK_BASE.classic[level - 1] + jitter(CLASSIC_JITTER, rng)
  return BOT_THINK_BASE.race[level - 1] + jitter(RACE_JITTER, rng)
}
