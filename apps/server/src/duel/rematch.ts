import { newPlayer } from './match'
import { settle } from './settle'
import {
  EMPTY_SECRETS,
  NO_REMATCH,
  REMATCH_MS,
  fail,
  otherSeat,
  playerAt,
  step,
  type Match,
  type Player,
  type Secrets,
  type Seat,
  type Step,
} from './types'

const live = (expiresAt: number | null, now: number): boolean =>
  expiresAt !== null && now < expiresAt

/** Offers a rematch; both sides learn the expiry. */
export function offerRematch(m: Match, s: Secrets, seat: Seat, now: number): Step {
  if (m.phase !== 'ended') return fail('ERR_NOT_STARTED')
  const expiresAt = now + REMATCH_MS
  return step({ ...m, rematch: { ...m.rematch, [seat]: expiresAt } }, s, [
    { to: seat, msg: { t: 'rematchOffer', from: 'me', expiresAt } },
    { to: otherSeat(seat), msg: { t: 'rematchOffer', from: 'opp', expiresAt } },
  ])
}

const fresh = (p: Player, m: Match): Player => ({
  ...newPlayer(p, m),
  connected: p.connected,
  disconnectedAt: p.disconnectedAt,
})

/**
 * Accepts the other side's live offer: a fresh lobby with the same players (ratings after
 * this match), friendly from now on, and the classic first mover swapped.
 */
export function acceptRematch(m: Match, s: Secrets, seat: Seat, now: number): Step {
  if (m.phase !== 'ended' || !m.players.b) return fail('ERR_INPUT')
  if (!live(m.rematch[otherSeat(seat)], now)) return fail('ERR_INPUT')
  const ratings = settle(m).ratings
  const a = playerAt(m, 'a')
  const b = playerAt(m, 'b')
  const next: Match = {
    ...m,
    opponentKind: m.opponentKind === 'quick' ? 'friend' : m.opponentKind,
    phase: 'lobby',
    players: {
      a: fresh({ ...a, rating: ratings?.a ?? a.rating }, m),
      b: fresh({ ...b, rating: ratings?.b ?? b.rating }, m),
    },
    createdAt: now,
    turn: null,
    firstMover: m.format === 'classic' && m.firstMover ? otherSeat(m.firstMover) : null,
    countdownAt: null,
    startedAt: null,
    endedAt: null,
    outcome: null,
    turnDeadline: null,
    warnedTurnAt: null,
    rematch: NO_REMATCH,
  }
  return step(next, EMPTY_SECRETS)
}

/** Drops offers whose window has closed. */
export function expireRematch(m: Match, s: Secrets, now: number): Step {
  const keep = (at: number | null): number | null => (live(at, now) ? at : null)
  return step({ ...m, rematch: { a: keep(m.rematch.a), b: keep(m.rematch.b) } }, s)
}
