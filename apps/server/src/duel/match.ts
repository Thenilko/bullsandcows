import { codes, isValidCode, totalCodes, type BotLevel, type Len, type Rng } from '@bc/game-core'
import { endMatch } from './end'
import {
  COUNTDOWN_MS,
  EMPTY_SECRETS,
  NO_REMATCH,
  TURN_MS,
  fail,
  otherSeat,
  step,
  withPlayer,
  type Emit,
  type Format,
  type Match,
  type OpponentKind,
  type Player,
  type PlayerInfo,
  type Secrets,
  type Seat,
  type Step,
} from './types'

export interface MatchOptions {
  readonly format: Format
  readonly len: Len
  readonly zero: boolean
  readonly opponentKind: OpponentKind
  readonly botLevel?: BotLevel
}

export function newPlayer(info: PlayerInfo, m: Pick<Match, 'len' | 'zero'>): Player {
  return {
    id: info.id,
    username: info.username,
    level: info.level,
    rating: info.rating,
    isGuest: info.isGuest,
    ready: false,
    hasSecret: false,
    guesses: [],
    left: totalCodes(m.len, m.zero),
    connected: true,
    disconnectedAt: null,
  }
}

export function createMatch(
  opts: MatchOptions,
  host: PlayerInfo,
  now: number,
): { match: Match; secrets: Secrets } {
  const match: Match = {
    format: opts.format,
    len: opts.len,
    zero: opts.zero,
    opponentKind: opts.opponentKind,
    botLevel: opts.botLevel ?? null,
    phase: 'lobby',
    players: { a: newPlayer(host, opts), b: null },
    createdAt: now,
    turn: null,
    firstMover: null,
    countdownAt: null,
    startedAt: null,
    endedAt: null,
    outcome: null,
    turnDeadline: null,
    warnedTurnAt: null,
    rematch: NO_REMATCH,
  }
  return { match, secrets: EMPTY_SECRETS }
}

/** The guest takes seat b; the host is always seat a. */
export function join(m: Match, s: Secrets, info: PlayerInfo): Step {
  if (m.players.b) return fail('ERR_ROOM_FULL')
  return step({ ...m, players: { a: m.players.a, b: newPlayer(info, m) } }, s)
}

const pickCode = (m: Match, rng: Rng): string => {
  const all = codes(m.len, m.zero)
  return all[Math.min(all.length - 1, Math.floor(rng() * all.length))]
}

const startCountdown = (m: Match, s: Secrets, now: number): Step => {
  const countdown: Emit = { to: 'both', msg: { t: 'countdown', startAt: now + COUNTDOWN_MS } }
  return step({ ...m, phase: 'countdown', countdownAt: now }, s, [countdown])
}

/** Both ready → race: shared secret and countdown; classic: the secrets phase. */
export function setReady(m: Match, s: Secrets, seat: Seat, now: number, rng: Rng): Step {
  if (m.phase === 'ended') return fail('ERR_FINISHED')
  if (!m.players.b) return fail('ERR_INPUT')
  if (m.phase !== 'lobby') return step(m, s)
  const next = withPlayer(m, seat, { ready: true })
  if (!next.players.a.ready || !next.players.b?.ready) return step(next, s)
  if (next.format === 'classic') return step({ ...next, phase: 'secrets' }, s)
  return startCountdown(next, { ...s, shared: pickCode(next, rng) }, now)
}

/** Classic only. A rematch keeps its preset (swapped) first mover. */
export function setSecret(
  m: Match,
  s: Secrets,
  seat: Seat,
  code: string,
  now: number,
  rng: Rng,
): Step {
  if (m.format !== 'classic') return fail('ERR_INPUT')
  if (m.phase === 'ended') return fail('ERR_FINISHED')
  if (m.phase === 'lobby') return fail('ERR_NOT_STARTED')
  if (m.phase !== 'secrets') return fail('ERR_INPUT')
  if (!isValidCode(code, m.len, m.zero)) return fail('ERR_CODE')
  const secrets = { ...s, [seat]: code }
  const next = withPlayer(m, seat, { hasSecret: true })
  if (secrets.a === null || secrets.b === null) return step(next, secrets)
  const firstMover: Seat = next.firstMover ?? (rng() < 0.5 ? 'a' : 'b')
  return startCountdown({ ...next, firstMover }, secrets, now)
}

/** Countdown over → playing; the clock starts now. */
export function begin(m: Match, s: Secrets, now: number): Step {
  if (m.phase === 'ended') return fail('ERR_FINISHED')
  if (m.phase === 'playing') return fail('ERR_INPUT')
  if (m.phase !== 'countdown' || m.countdownAt === null) return fail('ERR_NOT_STARTED')
  if (now < m.countdownAt + COUNTDOWN_MS) return fail('ERR_NOT_STARTED')
  const classic = m.format === 'classic'
  const next: Match = {
    ...m,
    phase: 'playing',
    startedAt: now,
    turn: classic ? m.firstMover : null,
    turnDeadline: classic ? now + TURN_MS : null,
    warnedTurnAt: null,
  }
  return step(next, s, [{ to: 'both', msg: { t: 'started', startedAt: now } }])
}

export function giveUp(m: Match, s: Secrets, seat: Seat, now: number): Step {
  if (m.phase === 'ended') return fail('ERR_FINISHED')
  if (m.phase === 'lobby' || !m.players.b) return fail('ERR_NOT_STARTED')
  return endMatch(m, s, { winner: otherSeat(seat), reason: 'giveUp' }, now)
}

/** Keeps the first disconnect time if already disconnected. */
export function markDisconnected(m: Match, s: Secrets, seat: Seat, now: number): Step {
  const p = m.players[seat]
  if (!p) return fail('ERR_INPUT')
  if (!p.connected) return step(m, s)
  return step(withPlayer(m, seat, { connected: false, disconnectedAt: now }), s)
}

export function markReconnected(m: Match, s: Secrets, seat: Seat): Step {
  if (!m.players[seat]) return fail('ERR_INPUT')
  return step(withPlayer(m, seat, { connected: true, disconnectedAt: null }), s)
}
