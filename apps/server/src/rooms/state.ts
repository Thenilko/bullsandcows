import type { RoomStatus } from '../duel/roomClient'
import type { Match, Secrets } from '../duel/types'

/** An invite waits this long for the second player (spec: valid 30 min or until start). */
export const INVITE_MS = 30 * 60_000
/** Both seats must be ready this long after seat b joined, or the match is abandoned. */
export const READY_MS = 60_000
/** Classic: time to choose a secret once the secrets phase begins. */
export const SECRETS_MS = 60_000
/** Delay before retrying a failed result write. */
export const PERSIST_RETRY_MS = 5_000

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
  /** The invite ran out before a second player joined. */
  readonly expired: boolean
  /** The current match's result has been claimed for recording (set before the write). */
  readonly resultRecorded: boolean
}

/** A result whose write failed; kept apart from the live state and retried by the alarm. */
export interface PendingResult {
  readonly match: Match
  readonly secrets: Secrets
  readonly retryAt: number
}

export interface RoomState {
  readonly match: Match
  readonly secrets: Secrets
  readonly tokens: Tokens
  readonly meta: RoomMeta
}

export function initialMeta(now: number): RoomMeta {
  return {
    createdAt: now,
    inviteExpiresAt: now + INVITE_MS,
    readyDeadline: null,
    secretsDeadline: null,
    expired: false,
    resultRecorded: false,
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
