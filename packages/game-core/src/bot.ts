import { codes, type Len } from './codes'
import { bestProbe } from './botSearch'

export type BotLevel = 1 | 2 | 3 | 4
export type Rng = () => number

/**
 * Base think time per level (index = level - 1). In a race the speed decides as much as the guesses, so every
 * level thinks about as long as a person does (people take 20–60 s a guess); the expert is a quick, sure
 * player at about 12 s, not a machine answering at once. In classic the turns alternate and the speed only
 * paces the game.
 */
export const BOT_THINK_BASE = {
  race: [35000, 25000, 18000, 12000],
  classic: [3600, 3000, 2500, 2000],
} as const

/** Race jitter per level (index = level - 1), added to the base think time. */
export const BOT_RACE_JITTER = [
  [-5000, 5000],
  [-5000, 5000],
  [-4000, 4000],
  [-3000, 3000],
] as const

/**
 * Chance per move (after the first) that the level plays a random untried code instead of one that fits the
 * answers so far — a lost hint. On 4 digits (people average about 7 guesses): about 10 at „Лесно“, 7 at
 * „Средно“, 6 at „Трудно“. The expert never loses a hint.
 */
export const BOT_RANDOM_CHANCE = { 1: 0.8, 2: 0.6, 3: 0.45 } as const

/**
 * The expert plays like a strong person, not a solver: only codes that fit every answer, and of a handful
 * of them it weighs (`BOT_PRO_SAMPLE`) the one whose answer would leave the fewest candidates on average.
 * It never plays a deliberately wrong „probe“ code and does not search every code. About 5 guesses on 4 digits.
 */
export const BOT_PRO_SAMPLE = 6

/**
 * The knobs the admin can turn (`/admin` → „Бот“); a room keeps the values it was created with.
 * `raceThinkMs`: race think base per level (index = level - 1), before `BOT_RACE_JITTER`.
 * `lostHint`: lost-hint chance per move for levels 1–3. `proSample`: how many candidates the expert weighs.
 */
export interface BotConfig {
  readonly raceThinkMs: readonly [number, number, number, number]
  readonly lostHint: readonly [number, number, number]
  readonly proSample: number
}

/** The built-in tuning; what a bot room uses until the admin saves something else. */
export const DEFAULT_BOT_CONFIG: BotConfig = {
  raceThinkMs: [...BOT_THINK_BASE.race],
  lostHint: [BOT_RANDOM_CHANCE[1], BOT_RANDOM_CHANCE[2], BOT_RANDOM_CHANCE[3]],
  proSample: BOT_PRO_SAMPLE,
}

const MIN_POOL_FOR_SEARCH = 3
const CLASSIC_JITTER = [-500, 700] as const

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]
}

/**
 * Picks the bot's next guess. Order in which `rng` is consumed (tests rely on it):
 *  1. levels 1–3 with prior guesses: one draw for the lost-hint roll; if it fires, one more draw picks
 *     uniformly from all codes not yet guessed.
 *  2. no prior guesses, fewer than 3 candidates, or levels 1–3: one draw picking from the pool.
 *  3. level 4: `config.proSample` draws from the pool (none when the pool is that small), then the best of them.
 */
export function botGuess(
  cands: readonly string[],
  guessed: readonly string[],
  level: BotLevel,
  len: Len,
  zero: boolean,
  rng: Rng = Math.random,
  config: BotConfig = DEFAULT_BOT_CONFIG,
): string {
  const remaining = cands.filter((c) => !guessed.includes(c))
  const pool = remaining.length > 0 ? remaining : cands
  if (level !== 4 && guessed.length > 0 && rng() < config.lostHint[level - 1]) {
    return pick(
      codes(len, zero).filter((c) => !guessed.includes(c)),
      rng,
    )
  }
  if (level !== 4 || guessed.length === 0 || pool.length < MIN_POOL_FOR_SEARCH)
    return pick(pool, rng)
  const sample = Math.max(1, Math.floor(config.proSample))
  const options =
    pool.length <= sample ? pool : Array.from({ length: sample }, () => pick(pool, rng))
  return bestProbe(pool, options, len, 'expected')
}

function jitter([a, b]: readonly [number, number], rng: Rng): number {
  return a + Math.floor(rng() * (b - a + 1))
}

/** How long the bot thinks before its next move; only the race base comes from `config`. */
export function botThinkMs(
  level: BotLevel,
  classic: boolean,
  rng: Rng = Math.random,
  config: BotConfig = DEFAULT_BOT_CONFIG,
): number {
  if (classic) return BOT_THINK_BASE.classic[level - 1] + jitter(CLASSIC_JITTER, rng)
  return config.raceThinkMs[level - 1] + jitter(BOT_RACE_JITTER[level - 1], rng)
}
