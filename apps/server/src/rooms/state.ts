import type { RoomStatus } from '../duel/roomClient'
import type { Match, Secrets } from '../duel/types'

/** An invite waits this long for the second player (spec: valid 30 min or until start). */
export const INVITE_MS = 30 * 60_000
/** Both seats must be ready this long after seat b joined, or the match is abandoned. */
export const READY_MS = 60_000
/** Classic: time to choose a secret once the secrets phase begins. */
export const SECRETS_MS = 60_000
/** First retry delay of a failed result write; doubles per attempt up to the max. */
export const PERSIST_RETRY_MS = 5_000
export const PERSIST_RETRY_MAX_MS = 5 * 60_000
/** Writes per result (the first one included) before the result is dropped. */
export const PERSIST_MAX_ATTEMPTS = 10

/** The seat tokens handed out by `/create` and `/join`; the bot seat has none. */
export interface Tokens {
  readonly a: string | null
  readonly b: string | null
}

/** Room-level facts the pure match machine does not know about. All times are Unix ms. */
export interface RoomMeta {
  readonly createdAt: number
  readonly inviteExpiresAt: number
  readonly readyDeadline: number | null
  readonly secretsDeadline: number | null
  /** When the bot makes its next move; null when it is not its time to think. */
  readonly botAt: number | null
  /** The invite ran out before a second player joined. */
  readonly expired: boolean
  /** The current match's result has been claimed for recording (set before the write). */
  readonly resultRecorded: boolean
  /** Invite rooms: the code, written to the duel row. */
  readonly inviteCode: string | null
}

/** Row ids chosen when a result is claimed, so every retry writes the same rows. */
export interface ResultIds {
  readonly duelId: string
  readonly gameA: string | null
  readonly gameB: string | null
}

/**
 * A claimed result, stored (key `pending:<duelId>`) in the same write that claims it and
 * deleted once written; kept apart from the live state, so a rematch cannot touch it.
 */
export interface PendingResult {
  readonly match: Match
  readonly secrets: Secrets
  readonly ids: ResultIds
  readonly inviteCode: string | null
  /** Failed writes so far. */
  readonly attempts: number
  readonly retryAt: number
}

/** Delay before the next try after `attempts` failures: 5 s, 10 s, 20 s… capped at 5 min. */
export const retryDelay = (attempts: number): number =>
  Math.min(PERSIST_RETRY_MS * 2 ** Math.max(0, attempts - 1), PERSIST_RETRY_MAX_MS)

export interface RoomState {
  readonly match: Match
  readonly secrets: Secrets
  readonly tokens: Tokens
  readonly meta: RoomMeta
}

export function initialMeta(now: number, inviteCode: string | null = null): RoomMeta {
  return {
    createdAt: now,
    inviteExpiresAt: now + INVITE_MS,
    readyDeadline: null,
    secretsDeadline: null,
    botAt: null,
    expired: false,
    resultRecorded: false,
    inviteCode,
  }
}

/** What `/info` reports; `waiting` is the only status a new player can join. */
export function roomStatus(st: RoomState): RoomStatus {
  if (st.meta.expired) return 'expired'
  if (st.match.phase === 'ended') return 'ended'
  if (st.match.phase === 'lobby' && !st.match.players.b) return 'waiting'
  return 'started'
}

export const isLive = (st: RoomState): boolean => {
  const status = roomStatus(st)
  return status === 'waiting' || status === 'started'
}
