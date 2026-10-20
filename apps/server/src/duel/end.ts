import type { RevealedSecrets } from '@bc/protocol'
import { settle } from './settle'
import {
  NO_REMATCH,
  otherSeat,
  step,
  type Emit,
  type Match,
  type MatchOutcome,
  type Secrets,
  type Seat,
  type Step,
} from './types'

/** Secrets as seen from `seat`: in a race both are the shared number. */
export function revealFor(m: Match, s: Secrets, seat: Seat): RevealedSecrets {
  if (m.format === 'race') return { mine: s.shared, theirs: s.shared }
  return { mine: s[seat], theirs: s[otherSeat(seat)] }
}

/** Ends the match and emits one `ended` per seat; `before` events go out first. */
export function endMatch(
  m: Match,
  s: Secrets,
  outcome: MatchOutcome,
  now: number,
  before: readonly Emit[] = [],
): Step {
  const ended: Match = {
    ...m,
    phase: 'ended',
    outcome,
    endedAt: now,
    turn: null,
    turnDeadline: null,
    rematch: NO_REMATCH,
  }
  const result = settle(ended)
  const endedFor = (seat: Seat): Emit => ({
    to: seat,
    msg: {
      t: 'ended',
      outcome: result.outcome[seat],
      reason: outcome.reason,
      secrets: revealFor(ended, s, seat),
      rating: result.ratingDelta?.[seat] ?? null,
      xp: result.xp[seat],
    },
  })
  return step(ended, s, [...before, endedFor('a'), endedFor('b')])
}
