import { codes, filterCandidates, isConsistent, type Len } from '@bc/game-core'
import type { GameViewDto, GuessEntryDto, GuessResultDto } from '@bc/protocol'

export interface DerivedGuess {
  consistent: boolean
  left: number
}

/** Replays the public verdicts over the full code set; used only to sanity-check the server. */
export function deriveGuesses(len: Len, zero: boolean, guesses: readonly GuessEntryDto[]): readonly DerivedGuess[] {
  let cands: readonly string[] = codes(len, zero)
  return guesses.map((g) => {
    const consistent = isConsistent(cands, g.guess)
    cands = filterCandidates(cands, g.guess, { bulls: g.bulls, cows: g.cows })
    return { consistent, left: cands.length }
  })
}

/** Indexes where the client replay disagrees with the server values. */
export function mismatches(len: Len, zero: boolean, guesses: readonly GuessEntryDto[]): readonly number[] {
  const derived = deriveGuesses(len, zero, guesses)
  return guesses.flatMap((g, i) => (derived[i]?.left === g.left && derived[i]?.consistent === g.consistent ? [] : [i]))
}

/** Game view with one more guess recorded (returns a new object). */
export function withGuess(game: GameViewDto, guess: string, r: GuessResultDto): GameViewDto {
  const entry: GuessEntryDto = { guess, bulls: r.bulls, cows: r.cows, consistent: r.consistent, left: r.left }
  return { ...game, attempts: game.attempts + 1, guesses: [...game.guesses, entry] }
}
