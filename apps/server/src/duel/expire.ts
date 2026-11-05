import { endMatch } from './end'
import { passTurn } from './guess'
import {
  COUNTDOWN_MS,
  MAX_SKIPS,
  RACE_CAP_MS,
  RECONNECT_MS,
  TURN_WARN_MS,
  otherSeat,
  playerAt,
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
  /** Classic turn timeout that only passes the move instead of ending the match. */
  readonly skip?: true
}

const strikesOf = (m: Match, seat: Seat): number => (m.skips?.[seat] ?? 0) + 1

/**
 * Classic: when the turn deadline passes (connected or not) the move passes to the opponent. It loses
 * the match only on the `MAX_SKIPS`-th timeout in a row, or when it was the last move after the
 * opponent had already solved.
 */
function turnDue(m: Match): Due[] {
  if (m.phase !== 'playing' || m.turn === null || m.turnDeadline === null) return []
  const other = otherSeat(m.turn)
  const last = playerAt(m, other).guesses.at(-1)
  const lastMove = last !== undefined && last.bulls === m.len
  const outcome: MatchOutcome = { winner: other, reason: 'timeout' }
  const skip = !lastMove && strikesOf(m, m.turn) < MAX_SKIPS
  return [{ at: m.turnDeadline, rank: 0, outcome, ...(skip ? { skip: true as const } : {}) }]
}

/** Passes a timed-out move to the opponent and tells both. */
function skipTurn(m: Match, s: Secrets, now: number): Step {
  if (m.turn === null) return step(m, s)
  const seat = m.turn
  const strikes = strikesOf(m, seat)
  const skips = { ...(m.skips ?? { a: 0, b: 0 }), [seat]: strikes }
  const strikesLeft = MAX_SKIPS - strikes
  // The next turn runs from the missed deadline, so a late alarm does not shorten it.
  const from = m.turnDeadline ?? now
  return passTurn({ ...m, skips }, s, otherSeat(seat), from, [
    { to: seat, msg: { t: 'skipped', mine: true, strikesLeft } },
    { to: otherSeat(seat), msg: { t: 'skipped', mine: false, strikesLeft } },
  ])
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
  if (due?.skip) return skipTurn(m, s, now)
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
