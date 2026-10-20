import type { BotLevel, Len, Rating } from '@bc/game-core'
import type {
  EndReason,
  ErrorCode,
  Format,
  OpponentKind,
  Phase,
  Seat,
  ServerMsg,
} from '@bc/protocol'

export type { EndReason, Format, OpponentKind, Phase, Seat }

export const TURN_MS = 60_000
export const TURN_WARN_MS = 15_000
export const RACE_CAP_MS = 15 * 60_000
export const RECONNECT_MS = 30_000
export const COUNTDOWN_MS = 2100
export const REMATCH_MS = 30_000

export interface GuessEntry {
  readonly guess: string
  readonly bulls: number
  readonly cows: number
  readonly consistent: boolean
  readonly at: number
}

export interface PlayerInfo {
  readonly id: string
  readonly username: string
  readonly level: number
  readonly rating: Rating
  readonly isGuest: boolean
}

export interface Player extends PlayerInfo {
  readonly ready: boolean
  readonly hasSecret: boolean
  readonly guesses: readonly GuessEntry[]
  readonly left: number
  readonly connected: boolean
  readonly disconnectedAt: number | null
}

export interface MatchOutcome {
  readonly winner: Seat | null
  readonly reason: EndReason
}

export interface Match {
  readonly format: Format
  readonly len: Len
  readonly zero: boolean
  readonly opponentKind: OpponentKind
  readonly botLevel: BotLevel | null
  readonly phase: Phase
  readonly players: { readonly a: Player; readonly b: Player | null }
  readonly createdAt: number
  readonly turn: Seat | null
  readonly firstMover: Seat | null
  readonly countdownAt: number | null
  readonly startedAt: number | null
  readonly endedAt: number | null
  readonly outcome: MatchOutcome | null
  readonly turnDeadline: number | null
  /** Classic: incremented on every turn change (first turn = 1). */
  readonly turnNo: number
  /** The `turnNo` the last 15 s warning was sent for; one warning per turn. */
  readonly warnedTurn: number | null
  /** Per seat: when that seat's rematch offer expires, or null. */
  readonly rematch: { readonly a: number | null; readonly b: number | null }
}

/** Kept apart from `Match`; never part of a public view before the end. */
export interface Secrets {
  readonly shared: string | null
  readonly a: string | null
  readonly b: string | null
}

/** One message for one seat (or both); the room routes it. State snapshots are not events. */
export interface Emit {
  readonly to: Seat | 'both'
  readonly msg: ServerMsg
}

export interface StepOk {
  readonly match: Match
  readonly secrets: Secrets
  readonly events: readonly Emit[]
}
export type Step = StepOk | { readonly error: ErrorCode }

export const fail = (error: ErrorCode): Step => ({ error })
export const step = (match: Match, secrets: Secrets, events: readonly Emit[] = []): Step => ({
  match,
  secrets,
  events,
})

export const otherSeat = (seat: Seat): Seat => (seat === 'a' ? 'b' : 'a')

export const EMPTY_SECRETS: Secrets = { shared: null, a: null, b: null }
export const NO_REMATCH = { a: null, b: null } as const

/** Seat b or a programming error: callers check `players.b` before using it. */
export function playerAt(m: Match, seat: Seat): Player {
  const p = m.players[seat]
  if (!p) throw new Error(`seat ${seat} is empty`)
  return p
}

export function withPlayer(m: Match, seat: Seat, patch: Partial<Player>): Match {
  const players = { ...m.players, [seat]: { ...playerAt(m, seat), ...patch } }
  return { ...m, players }
}

/** The secret a seat is trying to find. */
export const targetOf = (m: Match, s: Secrets, seat: Seat): string | null =>
  m.format === 'race' ? s.shared : s[otherSeat(seat)]
