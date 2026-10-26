import { bullsCows, type Verdict } from './verdict'

/** Candidates that would have produced verdict `v` for `guess`. Returns a new array. */
export function filterCandidates(
  cands: readonly string[],
  guess: string,
  v: Verdict,
): readonly string[] {
  return cands.filter((c) => {
    const r = bullsCows(c, guess)
    return r.bulls === v.bulls && r.cows === v.cows
  })
}

export function isConsistent(cands: readonly string[], guess: string): boolean {
  return cands.includes(guess)
}
