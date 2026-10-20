import { bullsCows, codes, filterCandidates, isConsistent, isValidCode } from '@bc/game-core'
import { endMatch } from './end'
import {
  TURN_MS,
  fail,
  otherSeat,
  playerAt,
  step,
  targetOf,
  withPlayer,
  type Emit,
  type GuessEntry,
  type Match,
  type Secrets,
  type Seat,
  type Step,
} from './types'

interface Recorded {
  readonly match: Match
  readonly solved: boolean
  readonly events: readonly Emit[]
}

const candidatesAfter = (m: Match, guesses: readonly GuessEntry[]): readonly string[] =>
  guesses.reduce<readonly string[]>(
    (cands, g) => filterCandidates(cands, g.guess, g),
    codes(m.len, m.zero),
  )

const solvedBy = (m: Match, guesses: readonly GuessEntry[]): boolean =>
  guesses.length > 0 && guesses[guesses.length - 1].bulls === m.len

/** Appends the verdict to the seat's guesses and builds `verdict` / `oppMoved`. */
function record(m: Match, seat: Seat, code: string, target: string, now: number): Recorded {
  const p = playerAt(m, seat)
  const before = candidatesAfter(m, p.guesses)
  const { bulls, cows } = bullsCows(target, code)
  const consistent = isConsistent(before, code)
  const left = filterCandidates(before, code, { bulls, cows }).length
  const guesses = [...p.guesses, { guess: code, bulls, cows, consistent, at: now }]
  const solved = bulls === m.len
  const attempts = guesses.length
  const events: readonly Emit[] = [
    { to: seat, msg: { t: 'verdict', guess: code, bulls, cows, consistent, left, attempts } },
    { to: otherSeat(seat), msg: { t: 'oppMoved', attempts, left, solved } },
  ]
  return { match: withPlayer(m, seat, { guesses, left }), solved, events }
}

const passTurn = (m: Match, s: Secrets, to: Seat, now: number, events: readonly Emit[]): Step =>
  step({ ...m, turn: to, turnDeadline: now + TURN_MS }, s, events)

/**
 * Classic: a solver who moved first leaves the opponent one last move with equal moves;
 * solving it is a draw, missing it loses.
 */
function afterClassic(r: Recorded, s: Secrets, seat: Seat, now: number): Step {
  const other = otherSeat(seat)
  const me = playerAt(r.match, seat)
  const opp = playerAt(r.match, other)
  const oppSolved = solvedBy(r.match, opp.guesses)
  if (r.solved && oppSolved)
    return endMatch(r.match, s, { winner: null, reason: 'draw' }, now, r.events)
  if (r.solved && opp.guesses.length < me.guesses.length) {
    return passTurn(r.match, s, other, now, r.events)
  }
  if (r.solved) return endMatch(r.match, s, { winner: seat, reason: 'solved' }, now, r.events)
  if (oppSolved) return endMatch(r.match, s, { winner: other, reason: 'solved' }, now, r.events)
  return passTurn(r.match, s, other, now, r.events)
}

/**
 * Race result already decided by a solve: a solving guess stamped at or before the winner's
 * solving guess (the room may stamp on receipt) flips it — strictly earlier wins, same ms is a
 * draw. Anything else is ERR_FINISHED.
 */
function lateSolve(m: Match, s: Secrets, seat: Seat, code: string, now: number): Step {
  const o = m.outcome
  if (m.format !== 'race' || !o || o.reason !== 'solved' || o.winner === null) {
    return fail('ERR_FINISHED')
  }
  if (o.winner === seat || s.shared === null || code !== s.shared) return fail('ERR_FINISHED')
  const winnerGuesses = playerAt(m, o.winner).guesses
  const solvedAt = winnerGuesses[winnerGuesses.length - 1]?.at
  if (solvedAt === undefined || now > solvedAt) return fail('ERR_FINISHED')
  const r = record(m, seat, code, s.shared, now)
  const winner = now < solvedAt ? seat : null
  return endMatch(r.match, s, { winner, reason: winner ? 'solved' : 'draw' }, now, r.events)
}

/** Validation order: phase, turn (classic), code, repeat. */
export function applyGuess(m: Match, s: Secrets, seat: Seat, code: string, now: number): Step {
  if (m.phase === 'ended') return lateSolve(m, s, seat, code, now)
  if (m.phase !== 'playing') return fail('ERR_NOT_STARTED')
  if (m.format === 'classic' && m.turn !== seat) return fail('ERR_NOT_YOUR_TURN')
  if (!isValidCode(code, m.len, m.zero)) return fail('ERR_CODE')
  if (playerAt(m, seat).guesses.some((g) => g.guess === code)) return fail('ERR_REPEAT')
  const target = targetOf(m, s, seat)
  if (target === null) return fail('ERR_INTERNAL')
  const r = record(m, seat, code, target, now)
  if (m.format === 'classic') return afterClassic(r, s, seat, now)
  if (r.solved) return endMatch(r.match, s, { winner: seat, reason: 'solved' }, now, r.events)
  return step(r.match, s, r.events)
}
