import {
  COUNTDOWN_MS,
  RACE_CAP_MS,
  RECONNECT_MS,
  TURN_WARN_MS,
  type Match,
  type Seat,
} from '../duel/types'
import { botToMove } from './botDriver'
import type { RoomMeta } from './state'

/**
 * Everything a duel room waits for. `bot` is the bot's next move.
 * `invite`, `ready` and `secrets` are room-level; the rest mirror the match machine.
 */
export type TimerKind =
  | 'countdown'
  | 'turnWarn'
  | 'turn'
  | 'cap'
  | 'reconnect:a'
  | 'reconnect:b'
  | 'bot'
  | 'rematch'
  | 'invite'
  | 'ready'
  | 'secrets'

export type Timers = Readonly<Partial<Record<TimerKind, number | undefined>>>

const pending = (timers: Timers): [TimerKind, number][] =>
  (Object.entries(timers) as [TimerKind, number | undefined][])
    .filter((e): e is [TimerKind, number] => e[1] !== undefined)
    .sort((x, y) => x[1] - y[1])

/** The earliest pending time, or null when nothing is pending. */
export function nextAlarm(timers: Timers): number | null {
  return pending(timers)[0]?.[1] ?? null
}

/** The timers whose time has come at `now`, earliest first. */
export function due(timers: Timers, now: number): readonly TimerKind[] {
  return pending(timers)
    .filter(([, at]) => at <= now)
    .map(([kind]) => kind)
}

const SEATS: readonly Seat[] = ['a', 'b']

/** Reconnect windows, as the machine counts them: the seat on turn is on the turn clock. */
function reconnectTimers(m: Match): Timers {
  if (m.phase === 'lobby' || m.phase === 'ended' || !m.players.b) return {}
  const onTurn = m.phase === 'playing' ? m.turn : null
  const entries = SEATS.flatMap((seat) => {
    const at = m.players[seat]?.disconnectedAt ?? null
    return at === null || seat === onTurn ? [] : [[`reconnect:${seat}`, at + RECONNECT_MS]]
  })
  return Object.fromEntries(entries) as Timers
}

function playTimers(m: Match): Timers {
  if (m.phase === 'countdown' && m.countdownAt !== null) {
    return { countdown: m.countdownAt + COUNTDOWN_MS }
  }
  if (m.phase !== 'playing') return {}
  if (m.format === 'race') return m.startedAt === null ? {} : { cap: m.startedAt + RACE_CAP_MS }
  if (m.turnDeadline === null) return {}
  const warn = m.warnedTurn === m.turnNo ? {} : { turnWarn: m.turnDeadline - TURN_WARN_MS }
  return { ...warn, turn: m.turnDeadline }
}

function roomLevel(m: Match, meta: RoomMeta): Timers {
  if (m.phase === 'lobby' && !m.players.b) {
    return meta.expired ? {} : { invite: meta.inviteExpiresAt }
  }
  if (m.phase === 'lobby' && meta.readyDeadline !== null) return { ready: meta.readyDeadline }
  if (m.phase === 'secrets' && meta.secretsDeadline !== null) {
    return { secrets: meta.secretsDeadline }
  }
  return {}
}

const botTimer = (m: Match, meta: RoomMeta): Timers =>
  botToMove(m) && meta.botAt != null ? { bot: meta.botAt } : {}

function rematchTimer(m: Match): Timers {
  if (m.phase !== 'ended') return {}
  const offers = [m.rematch.a, m.rematch.b].filter((t): t is number => t !== null)
  return offers.length > 0 ? { rematch: Math.min(...offers) } : {}
}

/** Every pending timer of the room, derived from the match and the room meta. */
export function roomTimers(m: Match, meta: RoomMeta): Timers {
  return {
    ...playTimers(m),
    ...reconnectTimers(m),
    ...roomLevel(m, meta),
    ...botTimer(m, meta),
    ...rematchTimer(m),
  }
}
