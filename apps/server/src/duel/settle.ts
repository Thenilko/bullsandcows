import { displayRating, duelXp, updateRating, type Outcome, type Rating } from '@bc/game-core'
import type { RatingChangeDto } from '@bc/protocol'
import { playerAt, type Match, type Seat } from './types'

export interface Settlement {
  readonly outcome: Readonly<Record<Seat, Outcome>>
  readonly xp: Readonly<Record<Seat, number>>
  /** Rounded display values; null unless a quick match ended with a result (not the cap). */
  readonly ratingDelta: Readonly<Record<Seat, RatingChangeDto>> | null
  /** New ratings to persist; null exactly when `ratingDelta` is null. */
  readonly ratings: Readonly<Record<Seat, Rating>> | null
}

const outcomeFor = (winner: Seat | null, seat: Seat): Outcome =>
  winner === null ? 'draw' : winner === seat ? 'win' : 'lose'

const change = (from: Rating, to: Rating): RatingChangeDto => {
  const before = displayRating(from)
  const after = displayRating(to)
  return { from: before, to: after, delta: after - before }
}

/** Pure result of an ended match: per-seat outcome, xp and (quick matches only) rating. */
export function settle(m: Match): Settlement {
  if (m.phase !== 'ended' || !m.outcome) throw new Error('settle: match has not ended')
  const { winner, reason } = m.outcome
  const outcome = { a: outcomeFor(winner, 'a'), b: outcomeFor(winner, 'b') }
  const level = m.botLevel ?? undefined
  const xp = {
    a: duelXp(outcome.a, m.opponentKind, level),
    b: duelXp(outcome.b, m.opponentKind, level),
  }
  if (m.opponentKind !== 'quick' || reason === 'cap' || !m.players.b) {
    return { outcome, xp, ratingDelta: null, ratings: null }
  }
  const a = playerAt(m, 'a').rating
  const b = playerAt(m, 'b').rating
  const next = updateRating(a, b, outcome.a)
  return {
    outcome,
    xp,
    ratingDelta: { a: change(a, next.me), b: change(b, next.opp) },
    ratings: { a: next.me, b: next.opp },
  }
}
