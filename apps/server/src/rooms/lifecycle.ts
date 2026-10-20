import { codes, type Rng } from '@bc/game-core'
import { endMatch, revealFor } from '../duel/end'
import { expire } from '../duel/expire'
import { begin, setReady, setSecret } from '../duel/match'
import { expireRematch } from '../duel/rematch'
import {
  COUNTDOWN_MS,
  NO_REMATCH,
  type Emit,
  type Match,
  type Seat,
  type Step,
} from '../duel/types'
import { botDueAt, botMove, botToMove } from './botDriver'
import { READY_MS, SECRETS_MS, type RoomState } from './state'

/** A room state together with the messages its change produced. */
export interface Advanced {
  readonly state: RoomState
  readonly events: readonly Emit[]
}

type Rule = (st: RoomState, now: number, rng: Rng) => Advanced | null

/** Upper bound on chained transitions per call (e.g. invite → bot ready → secret). */
const MAX_ROUNDS = 12

/** Applies a successful machine step to the room; errors become null (nothing to do). */
export function fromStep(st: RoomState, step: Step): Advanced | null {
  if ('error' in step) return null
  return { state: { ...st, match: step.match, secrets: step.secrets }, events: step.events }
}

const SEATS: readonly Seat[] = ['a', 'b']

/** Ends the match before play without a result: no rating, no XP, nothing recorded. */
export function abandon(st: RoomState, now: number): Advanced {
  const match: Match = {
    ...st.match,
    phase: 'ended',
    outcome: { winner: null, reason: 'abandoned' },
    endedAt: now,
    turn: null,
    turnDeadline: null,
    rematch: NO_REMATCH,
  }
  const events: Emit[] = SEATS.filter((seat) => match.players[seat]).map((seat) => ({
    to: seat,
    msg: {
      t: 'ended',
      outcome: 'draw',
      reason: 'abandoned',
      secrets: revealFor(match, st.secrets, seat),
      rating: null,
      xp: 0,
    },
  }))
  return { state: { ...st, match, meta: { ...st.meta, resultRecorded: true } }, events }
}

export const isAbandoned = (m: Match): boolean => m.outcome?.reason === 'abandoned'

const inviteRule: Rule = (st, now) => {
  const { match: m, meta } = st
  if (meta.expired || m.phase !== 'lobby' || m.players.b || meta.inviteExpiresAt > now) return null
  return { state: { ...st, meta: { ...meta, expired: true } }, events: [] }
}

const readyRule: Rule = (st, now) => {
  const deadline = st.meta.readyDeadline
  if (st.match.phase !== 'lobby' || deadline === null || deadline > now) return null
  return abandon(st, now)
}

/** Classic: whoever has not chosen a secret in time loses by timeout; nobody → abandoned. */
const secretsRule: Rule = (st, now) => {
  const deadline = st.meta.secretsDeadline
  const { match: m } = st
  if (m.phase !== 'secrets' || deadline === null || deadline > now) return null
  const has = SEATS.filter((seat) => m.players[seat]?.hasSecret)
  if (has.length !== 1) return abandon(st, now)
  return fromStep(st, endMatch(m, st.secrets, { winner: has[0]!, reason: 'timeout' }, now))
}

/** The clock starts at the scheduled end of the countdown, even if the alarm is late. */
const countdownRule: Rule = (st, now) => {
  const { match: m } = st
  if (m.phase !== 'countdown' || m.countdownAt === null) return null
  const startAt = m.countdownAt + COUNTDOWN_MS
  return startAt > now ? null : fromStep(st, begin(m, st.secrets, startAt))
}

const expireRule: Rule = (st, now) => {
  const step = expire(st.match, st.secrets, now)
  return 'error' in step || step.match === st.match ? null : fromStep(st, step)
}

const rematchRule: Rule = (st, now) => {
  const { match: m } = st
  const offers = [m.rematch.a, m.rematch.b]
  if (m.phase !== 'ended' || !offers.some((t) => t !== null && t <= now)) return null
  return fromStep(st, expireRematch(m, st.secrets, now))
}

const pickCode = (m: Match, rng: Rng): string => {
  const all = codes(m.len, m.zero)
  return all[Math.min(all.length - 1, Math.floor(rng() * all.length))]!
}

/** The bot seat (b) is always ready and picks its classic secret at once. Its moves: `botMoveRule`. */
const botRule: Rule = (st, now, rng) => {
  const { match: m } = st
  const bot = m.opponentKind === 'bot' ? m.players.b : null
  if (!bot) return null
  if (m.phase === 'lobby' && !bot.ready) return fromStep(st, setReady(m, st.secrets, 'b', now, rng))
  if (m.phase === 'secrets' && !bot.hasSecret) {
    return fromStep(st, setSecret(m, st.secrets, 'b', pickCode(m, rng), now, rng))
  }
  return null
}

/**
 * The bot's moves. When it is the bot's time to move a think timer is set (`meta.botAt`);
 * once due, the move is made and the timer cleared (the next round sets the following one).
 * The timer is cleared whenever it does not apply, so it can never spin the alarm.
 */
const botMoveRule: Rule = (st, now, rng) => {
  const { match: m, meta } = st
  const level = m.botLevel
  if (!botToMove(m) || level === null) {
    return meta.botAt == null
      ? null
      : { state: { ...st, meta: { ...meta, botAt: null } }, events: [] }
  }
  if (meta.botAt == null) {
    const botAt = botDueAt(m, level, now, rng)
    return { state: { ...st, meta: { ...meta, botAt } }, events: [] }
  }
  if (meta.botAt > now) return null
  const cleared = { ...st, meta: { ...meta, botAt: null } }
  return (
    fromStep(cleared, botMove(m, st.secrets, level, now, rng)) ?? {
      state: cleared,
      events: [],
    }
  )
}

/** Starts (or clears) the room deadlines that depend on the phase. */
const deadlineRule: Rule = (st, now) => {
  const { match: m, meta } = st
  const ready = m.phase === 'lobby' && m.players.b ? (meta.readyDeadline ?? now + READY_MS) : null
  const secrets = m.phase === 'secrets' ? (meta.secretsDeadline ?? now + SECRETS_MS) : null
  if (ready === meta.readyDeadline && secrets === meta.secretsDeadline) return null
  return {
    state: { ...st, meta: { ...meta, readyDeadline: ready, secretsDeadline: secrets } },
    events: [],
  }
}

const RULES: readonly Rule[] = [
  inviteRule,
  readyRule,
  secretsRule,
  countdownRule,
  expireRule,
  rematchRule,
  botRule,
  botMoveRule,
  deadlineRule,
]

/**
 * Brings the room up to `now`: room deadlines, the end of the countdown, the machine's
 * expiry, rematch offers and the bot seat. Runs before every client message and on alarms.
 */
export function advance(st: RoomState, now: number, rng: Rng): Advanced {
  let cur: Advanced = { state: st, events: [] }
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const next = RULES.reduce<Advanced | null>(
      (found, rule) => found ?? rule(cur.state, now, rng),
      null,
    )
    if (!next) break
    cur = { state: next.state, events: [...cur.events, ...next.events] }
  }
  return cur
}
