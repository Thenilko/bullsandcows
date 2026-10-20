import { endMatch } from './end'
import {
  COUNTDOWN_MS,
  RACE_CAP_MS,
  RECONNECT_MS,
  TURN_WARN_MS,
  otherSeat,
  step,
  type Match,
  type MatchOutcome,
  type Secrets,
  type Seat,
  type Step,
} from './types'

const SEATS: readonly Seat[] = ['a', 'b']

/** A deadline that ends the match; `rank` breaks ties (timeout, then disconnect, then cap). */
interface Due {
  readonly at: number
  readonly rank: number
  readonly outcome: MatchOutcome
}

/** Classic: the player on turn loses when the turn deadline passes, connected or not. */
function turnDue(m: Match): Due[] {
  if (m.phase !== 'playing' || m.turn === null || m.turnDeadline === null) return []
  return [
    { at: m.turnDeadline, rank: 0, outcome: { winner: otherSeat(m.turn), reason: 'timeout' } },
  ]
}

/** Reconnect windows; the seat on turn is governed by the turn clock alone (Review Focus 4). */
function disconnectDue(m: Match): Due[] {
  const onTurn = m.phase === 'playing' ? m.turn : null
  return SEATS.flatMap((seat) => {
    const at = m.players[seat]?.disconnectedAt ?? null
    if (at === null || seat === onTurn) return []
    const outcome: MatchOutcome = { winner: otherSeat(seat), reason: 'disconnect' }
    return [{ at: at + RECONNECT_MS, rank: 1, outcome }]
  })
}

function capDue(m: Match): Due[] {
  if (m.format !== 'race' || m.phase !== 'playing' || m.startedAt === null) return []
  return [{ at: m.startedAt + RACE_CAP_MS, rank: 2, outcome: { winner: null, reason: 'cap' } }]
}

const endingDues = (m: Match): Due[] =>
  m.phase === 'ended' || m.phase === 'lobby' || !m.players.b
    ? []
    : [...turnDue(m), ...disconnectDue(m), ...capDue(m)]

/** The first deadline to have passed; both reconnect windows closing in the same ms is a draw. */
function firstDue(m: Match, now: number): Due | null {
  const due = endingDues(m)
    .filter((d) => d.at <= now)
    .sort((x, y) => x.at - y.at || x.rank - y.rank)
  const [first, second] = due
  if (!first) return null
  const bothGone = second && second.rank === 1 && first.rank === 1 && second.at === first.at
  return bothGone ? { ...first, outcome: { winner: null, reason: 'disconnect' } } : first
}

const warnAt = (m: Match): number | null =>
  m.phase === 'playing' && m.turn !== null && m.turnDeadline !== null && m.warnedTurn !== m.turnNo
    ? m.turnDeadline - TURN_WARN_MS
    : null

/** One warning per turn, TURN_WARN_MS before the deadline, to the player on turn. */
function warning(m: Match, s: Secrets, now: number): Step {
  const at = warnAt(m)
  if (at === null || m.turn === null || m.turnDeadline === null || now < at) return step(m, s)
  return step({ ...m, warnedTurn: m.turnNo }, s, [
    { to: m.turn, msg: { t: 'warning', msLeft: m.turnDeadline - now } },
  ])
}

/**
 * Applies whatever is due at `now`: of the passed deadlines (turn, reconnect, race cap) the
 * earliest wins, so a late alarm still picks the right loser; otherwise the 15 s turn warning.
 */
export function expire(m: Match, s: Secrets, now: number): Step {
  const due = firstDue(m, now)
  if (due) return endMatch(m, s, due.outcome, now)
  return warning(m, s, now)
}

/** The earliest pending time the room should wake up at (for its alarm), or null. */
export function nextDueAt(m: Match): number | null {
  const times: (number | null)[] = [
    ...endingDues(m).map((d) => d.at),
    warnAt(m),
    m.phase === 'countdown' && m.countdownAt !== null ? m.countdownAt + COUNTDOWN_MS : null,
    ...(m.phase === 'ended' ? [m.rematch.a, m.rematch.b] : []),
  ]
  const pending = times.filter((t): t is number => t !== null)
  return pending.length > 0 ? Math.min(...pending) : null
}
