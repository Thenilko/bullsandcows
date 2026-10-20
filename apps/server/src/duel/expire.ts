import { endMatch } from './end'
import {
  RACE_CAP_MS,
  RECONNECT_MS,
  TURN_WARN_MS,
  otherSeat,
  step,
  type Match,
  type Secrets,
  type Seat,
  type Step,
} from './types'

const SEATS: readonly Seat[] = ['a', 'b']

/** Classic: the player on turn loses when the deadline passes, connected or not. */
function turnTimeout(m: Match, s: Secrets, now: number): Step | null {
  if (m.phase !== 'playing' || m.turn === null || m.turnDeadline === null) return null
  if (now < m.turnDeadline) return null
  return endMatch(m, s, { winner: otherSeat(m.turn), reason: 'timeout' }, now)
}

/** A seat away for RECONNECT_MS loses; if both are, the earlier leaver loses (same ms: draw). */
function disconnectLoss(m: Match, s: Secrets, now: number): Step | null {
  const gone = SEATS.flatMap((seat) => {
    const at = m.players[seat]?.disconnectedAt ?? null
    return at !== null && now >= at + RECONNECT_MS ? [{ seat, at }] : []
  })
  if (gone.length === 0) return null
  const [first, second] = [...gone].sort((x, y) => x.at - y.at)
  const winner = second && second.at === first.at ? null : otherSeat(first.seat)
  return endMatch(m, s, { winner, reason: 'disconnect' }, now)
}

function raceCap(m: Match, s: Secrets, now: number): Step | null {
  if (m.format !== 'race' || m.phase !== 'playing' || m.startedAt === null) return null
  if (now < m.startedAt + RACE_CAP_MS) return null
  return endMatch(m, s, { winner: null, reason: 'cap' }, now)
}

/** One warning per turn, TURN_WARN_MS before the deadline, to the player on turn. */
function warning(m: Match, s: Secrets, now: number): Step {
  const deadline = m.turnDeadline
  if (m.phase !== 'playing' || m.turn === null || deadline === null) return step(m, s)
  if (now < deadline - TURN_WARN_MS || m.warnedTurnAt === deadline) return step(m, s)
  return step({ ...m, warnedTurnAt: deadline }, s, [
    { to: m.turn, msg: { t: 'warning', msLeft: deadline - now } },
  ])
}

/**
 * Applies whatever is due at `now`, in priority order: turn deadline (classic), reconnect
 * window, race cap; otherwise the 15 s turn warning. Ended matches and the lobby are no-ops.
 */
export function expire(m: Match, s: Secrets, now: number): Step {
  if (m.phase === 'ended' || m.phase === 'lobby' || !m.players.b) return step(m, s)
  return (
    turnTimeout(m, s, now) ?? disconnectLoss(m, s, now) ?? raceCap(m, s, now) ?? warning(m, s, now)
  )
}
