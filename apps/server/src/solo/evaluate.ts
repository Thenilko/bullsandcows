import { codes, filterCandidates, type Len } from '@bc/game-core'

export interface Judged {
  readonly guess: string
  readonly bulls: number
  readonly cows: number
}

/** Codes still possible after all `judged` guesses; computed per call, never cached across requests. */
export function candidatesAfter(
  len: Len,
  zero: boolean,
  judged: readonly Judged[],
): readonly string[] {
  return judged.reduce<readonly string[]>(
    (cands, j) => filterCandidates(cands, j.guess, j),
    codes(len, zero),
  )
}

/** `left` after each guess in turn, from a single pass over the shrinking candidate list. */
export function leftAfterEach(len: Len, zero: boolean, judged: readonly Judged[]): number[] {
  const lefts: number[] = []
  let cands = codes(len, zero)
  for (const j of judged) {
    cands = filterCandidates(cands, j.guess, j)
    lefts.push(cands.length)
  }
  return lefts
}
