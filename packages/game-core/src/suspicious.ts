import type { Len } from './codes'

export const SUSPICIOUS = { minAvgIntervalMs: 400, fastSolveMs: 8000, fastSolveMinLen: 4 } as const

function averageIntervalMs(guessAtMs: readonly number[]): number {
  return (guessAtMs[guessAtMs.length - 1] - guessAtMs[0]) / (guessAtMs.length - 1)
}

/** `guessAtMs` are ascending absolute timestamps. Flags bot-like pace or an implausibly fast solve. */
export function isSuspicious(
  guessAtMs: readonly number[],
  startedAtMs: number,
  len: Len,
  solved: boolean,
): boolean {
  if (guessAtMs.length >= 2 && averageIntervalMs(guessAtMs) < SUSPICIOUS.minAvgIntervalMs) {
    return true
  }
  if (!solved || len < SUSPICIOUS.fastSolveMinLen || guessAtMs.length === 0) return false
  return guessAtMs[guessAtMs.length - 1] - startedAtMs < SUSPICIOUS.fastSolveMs
}
