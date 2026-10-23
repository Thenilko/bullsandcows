import { levelFromXp, type Rng } from '@bc/game-core'
import { ClientMsg, type ErrorCode } from '@bc/protocol'
import { applyGuess } from '../duel/guess'
import { giveUp, setReady, setSecret } from '../duel/match'
import { acceptRematch, offerRematch } from '../duel/rematch'
import { settle } from '../duel/settle'
import { REMATCH_MS, otherSeat, withPlayer, type Match, type Seat, type Step } from '../duel/types'
import type { Profile } from '../ports/repo'
import { isAbandoned, type Advanced } from './lifecycle'
import type { RoomState } from './state'

/** Upper bound for an incoming frame; real messages are a few dozen bytes. */
const MAX_FRAME = 1024

const CODE_MESSAGES: readonly unknown[] = ['guess', 'secret']

/**
 * Parses a client frame. A guess/secret whose code is a string of the wrong shape is
 * `ERR_CODE` (as the machine would answer); anything else malformed is `ERR_INPUT`.
 */
export function parseClient(data: string | ArrayBuffer): ClientMsg | ErrorCode {
  if (typeof data !== 'string' || data.length > MAX_FRAME) return 'ERR_INPUT'
  let raw: unknown
  try {
    raw = JSON.parse(data)
  } catch {
    return 'ERR_INPUT'
  }
  const parsed = ClientMsg.safeParse(raw)
  if (parsed.success) return parsed.data
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const isCodeMsg = CODE_MESSAGES.includes(obj.t) && typeof obj.code === 'string'
  return isCodeMsg && (obj.code as string).length <= 16 ? 'ERR_CODE' : 'ERR_INPUT'
}

/** Applies a game message (everything but `rematch`) for `seat`. */
export function applyClient(
  st: RoomState,
  seat: Seat,
  msg: Exclude<ClientMsg, { t: 'rematch' }>,
  now: number,
  rng: Rng,
): Step {
  const { match: m, secrets: s } = st
  switch (msg.t) {
    case 'ready':
      return setReady(m, s, seat, now, rng, st.meta.testSecret ?? undefined)
    case 'secret':
      return setSecret(m, s, seat, msg.code, now, rng)
    case 'guess':
      return applyGuess(
        msg.usedNotes ? withPlayer(m, seat, { usedNotes: true }) : m,
        s,
        seat,
        msg.code,
        now,
      )
    case 'giveUp':
      return giveUp(m, s, seat, now)
  }
}

const live = (at: number | null, now: number): boolean => at !== null && now < at

/** Whether `seat` asking for a rematch accepts a live offer (true) or makes one (false). */
export function acceptsRematch(m: Match, seat: Seat, now: number): boolean {
  return m.opponentKind === 'bot' || live(m.rematch[otherSeat(seat)], now)
}

/**
 * Current level (and, unless this match changed it, rating) from the stored profiles, so a
 * rematch shows what the players have now. Quick-match ratings come from `settle` instead.
 */
export function refreshPlayers(m: Match, profiles: Readonly<Record<string, Profile>>): Match {
  const keepRating = settle(m).ratings !== null
  return (['a', 'b'] as const).reduce((acc, seat) => {
    const p = acc.players[seat]
    const profile = p ? profiles[p.id] : undefined
    if (!profile) return acc
    const level = levelFromXp(profile.xp)
    return withPlayer(acc, seat, keepRating ? { level } : { level, rating: profile.rating })
  }, m)
}

const unwrap = (st: RoomState, step: Step): Advanced | ErrorCode =>
  'error' in step
    ? step.error
    : { state: { ...st, match: step.match, secrets: step.secrets }, events: step.events }

/**
 * `rematch` from `seat`: makes an offer, or accepts the other side's live one (a bot offers
 * and accepts on the spot). Accepting starts a fresh match whose result is not recorded yet.
 */
export function rematch(st: RoomState, seat: Seat, now: number): Advanced | ErrorCode {
  const { match: m, secrets: s } = st
  if (m.phase !== 'ended') return 'ERR_NOT_STARTED'
  if (isAbandoned(m)) return 'ERR_FINISHED'
  if (!acceptsRematch(m, seat, now)) return unwrap(st, offerRematch(m, s, seat, now))
  const base: Match =
    m.opponentKind === 'bot' ? { ...m, rematch: { ...m.rematch, b: now + REMATCH_MS } } : m
  const next = unwrap(st, acceptRematch(base, s, seat, now))
  if (typeof next === 'string') return next
  const meta = { ...st.meta, resultRecorded: false, gameIds: undefined }
  return { state: { ...next.state, meta }, events: next.events }
}
