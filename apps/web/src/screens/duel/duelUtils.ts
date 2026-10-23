import type { PublicState } from '@bc/protocol'
import type { EndedEvent } from '../../features/duel/store'

export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}


export type Outcome = 'win' | 'lose' | 'draw'

/** Outcome from the `ended` event, or reconstructed from the snapshot after a reload. */
export function outcomeOf(state: PublicState, ended: EndedEvent | null): Outcome | null {
  if (ended) return ended.outcome
  if (state.phase !== 'ended' || !state.outcome) return null
  if (state.outcome.winner === null) return 'draw'
  return state.outcome.winner === state.mySeat ? 'win' : 'lose'
}

const BOT_KEYS = { 1: 'easy', 2: 'normal', 3: 'hard', 4: 'expert' } as const

/** i18n key segment for a bot level (defaults to normal). */
export function botLevelKey(level: 1 | 2 | 3 | 4 | null): (typeof BOT_KEYS)[1 | 2 | 3 | 4] {
  return level ? BOT_KEYS[level] : 'normal'
}
