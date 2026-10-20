import {
  botGuess,
  botThinkMs,
  codes,
  filterCandidates,
  type BotLevel,
  type Rng,
} from '@bc/game-core'
import { applyGuess } from '../duel/guess'
import { fail, targetOf, type Match, type Secrets, type Step } from '../duel/types'

/** The bot never answers sooner than this, whatever the jitter says. */
export const MIN_THINK_MS = 1000

/**
 * The bot's next guess, applied through the machine as seat `b`. Its candidates come from its
 * own guesses against its own target (race: the shared secret; classic: the human's secret),
 * so it never sees anything the human's view would not show.
 */
export function botMove(
  m: Match,
  s: Secrets,
  level: BotLevel,
  now: number,
  rng: Rng = Math.random,
): Step {
  const bot = m.players.b
  if (!bot) return fail('ERR_NOT_STARTED')
  const guessed = bot.guesses.map((g) => g.guess)
  const cands = bot.guesses.reduce(
    (acc, g) => filterCandidates(acc, g.guess, { bulls: g.bulls, cows: g.cows }),
    codes(m.len, m.zero),
  )
  if (targetOf(m, s, 'b') === null) return fail('ERR_INTERNAL')
  const code = botGuess(cands, guessed, level, m.len, m.zero, rng)
  return applyGuess(m, s, 'b', code, now)
}

/** When the bot should move next, counted from `now`. */
export function botDueAt(m: Match, level: BotLevel, now: number, rng: Rng): number {
  return now + Math.max(MIN_THINK_MS, botThinkMs(level, m.format === 'classic', rng))
}

/** Whether the bot is to move right now: race while playing, classic on its turn. */
export const botToMove = (m: Match): boolean =>
  m.opponentKind === 'bot' &&
  m.botLevel !== null &&
  m.phase === 'playing' &&
  (m.format === 'race' || m.turn === 'b')
