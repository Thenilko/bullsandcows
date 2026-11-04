import { codes, type Len } from './codes'
import { bestProbe } from './botSearch'

export type BotLevel = 1 | 2 | 3 | 4
export type Rng = () => number

/**
 * Base think time per level (index = level - 1). In a race the speed decides as much as the guesses, so the
 * two easy levels think about as long as a person does (people take 20–60 s a guess); the expert answers in
 * 2–3 s. In classic the turns alternate and the speed only paces the game.
 */
export const BOT_THINK_BASE = {
  race: [35000, 22000, 12000, 2500],
  classic: [3600, 3000, 2500, 2000],
} as const

/** Race jitter per level (index = level - 1), added to the base think time. */
export const BOT_RACE_JITTER = [
  [-5000, 5000],
  [-4000, 4000],
  [-2000, 2500],
  [-500, 500],
] as const

/**
 * Chance per move (after the first) that the level plays a random untried code instead of one that fits the
 * answers so far. About 10 guesses on 4 digits at „Лесно“, about 7 (an average person) at „Средно“; „Трудно“
 * always plays a fitting code (about 5).
 */
export const BOT_RANDOM_CHANCE = { 1: 0.8, 2: 0.6 } as const

/**
 * How the expert chooses a guess (after the first move, which is a random code: every first guess is
 * equivalent): every code is a probe (inconsistent ones too) and the expected pool size after the answer is
 * minimised, within `budget` probe×candidate evaluations (see `expertProbes`).
 */
export const BOT_SEARCH = {
  4: { budget: 6_000_000 },
} as const

const MIN_POOL_FOR_SEARCH = 3
const CLASSIC_JITTER = [-500, 700] as const

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]
}

const draws = (pool: readonly string[], k: number, rng: Rng): string[] =>
  Array.from({ length: k }, () => pick(pool, rng))

/**
 * The expert's probe set for the budget: all codes when they fit, else the whole pool, else a sample
 * of the pool. `rng` is consumed only in the last case (one draw per probe).
 */
export function expertProbes(
  pool: readonly string[],
  all: readonly string[],
  budget: number,
  rng: Rng,
): readonly string[] {
  if (all.length * pool.length <= budget) return all
  if (pool.length * pool.length <= budget) return pool
  return draws(pool, Math.max(1, Math.floor(budget / pool.length)), rng)
}

/**
 * Picks the bot's next guess. Order in which `rng` is consumed (tests rely on it):
 *  1. levels 1–2 with prior guesses: one draw for the random-branch roll; if it fires,
 *     one more draw picks uniformly from all codes not yet guessed.
 *  2. no prior guesses, or fewer than 3 candidates, or level <= 3: one draw picking from the pool.
 *  3. level 4: no draws unless the probe set has to be sampled (`expertProbes`).
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
  const randomChance = level === 1 || level === 2 ? BOT_RANDOM_CHANCE[level] : 0
  if (randomChance > 0 && guessed.length > 0 && rng() < randomChance) {
    return pick(
      codes(len, zero).filter((c) => !guessed.includes(c)),
      rng,
    )
  }
  if (level <= 3 || guessed.length === 0 || pool.length < MIN_POOL_FOR_SEARCH)
    return pick(pool, rng)
  return bestProbe(
    pool,
    expertProbes(pool, codes(len, zero), BOT_SEARCH[4].budget, rng),
    len,
    'expected',
  )
}

function jitter([a, b]: readonly [number, number], rng: Rng): number {
  return a + Math.floor(rng() * (b - a + 1))
}

export function botThinkMs(level: BotLevel, classic: boolean, rng: Rng = Math.random): number {
  if (classic) return BOT_THINK_BASE.classic[level - 1] + jitter(CLASSIC_JITTER, rng)
  return BOT_THINK_BASE.race[level - 1] + jitter(BOT_RACE_JITTER[level - 1], rng)
}
