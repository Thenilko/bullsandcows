import { codes, filterCandidates, type Len } from '@bc/game-core'
import type { GuessEntryDto, MyGuessDto } from '@bc/protocol'

/**
 * The duel state carries my guesses without the running candidate count the notebook history
 * shows („N вар.“); it is recomputed here from the answers, as the server did.
 */
export function toNotebookGuesses(guesses: readonly MyGuessDto[], len: Len, zero: boolean): GuessEntryDto[] {
  let pool = codes(len, zero)
  return guesses.map((g) => {
    pool = filterCandidates(pool, g.guess, g)
    return { guess: g.guess, bulls: g.bulls, cows: g.cows, consistent: g.consistent, left: pool.length }
  })
}
