import type { ErrorCode } from '@bc/protocol'
import { begin, createMatch, join, setReady, setSecret } from './match'
import type { Emit, Match, PlayerInfo, Secrets, Seat, Step, StepOk } from './types'
import { COUNTDOWN_MS } from './types'

/** Test fixtures for the duel state machine (no test-runner dependency). */

export const T0 = 1_000_000
/** rng() = 0 → shared secret '1234' (first code) and first mover 'a'. */
export const rngZero = (): number => 0
export const rngHigh = (): number => 0.99

export const alice: PlayerInfo = {
  id: 'alice',
  username: 'Alice',
  level: 3,
  rating: { rating: 1500, rd: 200, vol: 0.06 },
  isGuest: false,
}
export const bob: PlayerInfo = {
  id: 'bob',
  username: 'Bob',
  level: 1,
  rating: { rating: 1600.4, rd: 180, vol: 0.06 },
  isGuest: false,
}

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

/** Unwraps a successful step and deep-freezes it, so any later in-place mutation throws. */
export function ok(step: Step): StepOk {
  if ('error' in step) throw new Error(`unexpected ${step.error}`)
  return deepFreeze(step)
}

export function errorOf(step: Step): ErrorCode | null {
  return 'error' in step ? step.error : null
}

export const eventsTo = (events: readonly Emit[], seat: Seat) =>
  events.filter((e) => e.to === seat || e.to === 'both').map((e) => e.msg)

export interface Game {
  readonly match: Match
  readonly secrets: Secrets
}

export function lobby(
  format: 'race' | 'classic',
  opponentKind: 'quick' | 'friend' | 'bot' = 'quick',
): Game {
  const created = deepFreeze(createMatch({ format, len: 4, zero: false, opponentKind }, alice, T0))
  return ok(join(created.match, created.secrets, bob))
}

export function readyBoth(g: Game, rng = rngZero, now = T0): StepOk {
  const a = ok(setReady(g.match, g.secrets, 'a', now, rng))
  return ok(setReady(a.match, a.secrets, 'b', now, rng))
}

export function raceInPlay(opponentKind: 'quick' | 'friend' | 'bot' = 'quick'): StepOk {
  const r = readyBoth(lobby('race', opponentKind))
  return ok(begin(r.match, r.secrets, T0 + COUNTDOWN_MS))
}

export function classicInPlay(rng = rngZero, secretA = '1234', secretB = '5678'): StepOk {
  const r = readyBoth(lobby('classic'), rng)
  const a = ok(setSecret(r.match, r.secrets, 'a', secretA, T0, rng))
  const b = ok(setSecret(a.match, a.secrets, 'b', secretB, T0, rng))
  return ok(begin(b.match, b.secrets, T0 + COUNTDOWN_MS))
}

/** Start of play in the fixtures above. */
export const PLAY_AT = T0 + COUNTDOWN_MS
