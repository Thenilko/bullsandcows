import { describe, expect, it } from 'vitest'
import { applyGuess } from './guess'
import { begin, createMatch, giveUp, join, setReady, setSecret } from './match'
import { settle } from './settle'
import {
  PLAY_AT,
  T0,
  alice,
  bob,
  classicInPlay,
  errorOf,
  eventsTo,
  lobby,
  ok,
  raceInPlay,
  readyBoth,
  rngHigh,
  rngZero,
  type Game,
} from './testing'
import { COUNTDOWN_MS, TURN_MS, type Seat } from './types'

const guess = (g: Game, seat: Seat, code: string, now: number) =>
  ok(applyGuess(g.match, g.secrets, seat, code, now))

/** Plays alternating guesses; `moves` are [seat, code] pairs, one second apart. */
const playAll = (g: Game, moves: readonly [Seat, string][], from = PLAY_AT + 1000): Game =>
  moves.reduce<Game>((acc, [seat, code], i) => guess(acc, seat, code, from + i * 1000), g)

describe('lobby', () => {
  it('creates a match with the host in seat a and an empty seat b', () => {
    const { match, secrets } = createMatch(
      { format: 'race', len: 4, zero: false, opponentKind: 'friend' },
      alice,
      T0,
    )
    expect(match.phase).toBe('lobby')
    expect(match.players.a).toMatchObject({ id: 'alice', ready: false, left: 3024, guesses: [] })
    expect(match.players.b).toBeNull()
    expect(match.botLevel).toBeNull()
    expect(secrets).toEqual({ shared: null, a: null, b: null })
  })

  it('fills seat b once and then reports ERR_ROOM_FULL', () => {
    const g = lobby('race')
    expect(g.match.players.b?.id).toBe('bob')
    expect(errorOf(join(g.match, g.secrets, { ...bob, id: 'carol' }))).toBe('ERR_ROOM_FULL')
  })

  it('cannot get ready before the opponent has joined', () => {
    const { match, secrets } = createMatch(
      { format: 'race', len: 4, zero: false, opponentKind: 'friend' },
      alice,
      T0,
    )
    expect(errorOf(setReady(match, secrets, 'b', T0, rngZero))).toBe('ERR_INPUT')
  })
})

describe('race', () => {
  it('starts the countdown with a shared secret once both are ready', () => {
    const g = lobby('race')
    const before = structuredClone(g)
    const a = ok(setReady(g.match, g.secrets, 'a', T0, rngZero))
    expect(a.match.phase).toBe('lobby')
    const r = ok(setReady(a.match, a.secrets, 'b', T0, rngZero))
    expect(r.match.phase).toBe('countdown')
    expect(r.match.countdownAt).toBe(T0)
    expect(r.secrets.shared).toBe('1234')
    expect(r.events).toEqual([{ to: 'both', msg: { t: 'countdown', startAt: T0 + COUNTDOWN_MS } }])
    expect(g).toEqual(before)
  })

  it('rejects a guess before begin with ERR_NOT_STARTED (Review Focus 2)', () => {
    const r = readyBoth(lobby('race'))
    expect(errorOf(applyGuess(r.match, r.secrets, 'b', '5678', T0 + 500))).toBe('ERR_NOT_STARTED')
  })

  it('begins only after the countdown', () => {
    const r = readyBoth(lobby('race'))
    expect(errorOf(begin(r.match, r.secrets, T0 + COUNTDOWN_MS - 1))).toBe('ERR_NOT_STARTED')
    const b = ok(begin(r.match, r.secrets, PLAY_AT))
    expect(b.match.phase).toBe('playing')
    expect(b.match.startedAt).toBe(PLAY_AT)
    expect(b.match.turn).toBeNull()
    expect(b.match.turnDeadline).toBeNull()
    expect(b.events).toEqual([{ to: 'both', msg: { t: 'started', startedAt: PLAY_AT } }])
  })

  it('answers a miss with a verdict to the actor and oppMoved to the other', () => {
    const g = raceInPlay()
    const before = structuredClone(g)
    const s = guess(g, 'a', '1243', PLAY_AT + 1000)
    expect(eventsTo(s.events, 'a')).toEqual([
      { t: 'verdict', guess: '1243', bulls: 2, cows: 2, consistent: true, left: 6, attempts: 1 },
    ])
    expect(eventsTo(s.events, 'b')).toEqual([
      { t: 'oppMoved', attempts: 1, left: 6, solved: false },
    ])
    expect(s.match.players.a.guesses).toEqual([
      { guess: '1243', bulls: 2, cows: 2, consistent: true, at: PLAY_AT + 1000 },
    ])
    expect(s.match.phase).toBe('playing')
    expect(g).toEqual(before)
  })

  it('flags an inconsistent guess', () => {
    const s1 = guess(raceInPlay(), 'a', '5678', PLAY_AT + 1000)
    const s2 = guess(s1, 'a', '5679', PLAY_AT + 2000)
    expect(eventsTo(s2.events, 'a')[0]).toMatchObject({ consistent: false, attempts: 2 })
  })

  it('rejects an invalid code and a repeated guess', () => {
    const g = raceInPlay()
    expect(errorOf(applyGuess(g.match, g.secrets, 'a', '1123', PLAY_AT + 1))).toBe('ERR_CODE')
    expect(errorOf(applyGuess(g.match, g.secrets, 'a', '0123', PLAY_AT + 1))).toBe('ERR_CODE')
    const s = guess(g, 'a', '5678', PLAY_AT + 1)
    expect(errorOf(applyGuess(s.match, s.secrets, 'a', '5678', PLAY_AT + 2))).toBe('ERR_REPEAT')
    expect(errorOf(applyGuess(s.match, s.secrets, 'b', '5678', PLAY_AT + 2))).toBeNull()
  })

  it('ends when a solves: win/lose, 120/40 xp and rating for a quick match', () => {
    const s = guess(raceInPlay(), 'a', '1234', PLAY_AT + 5000)
    expect(s.match.phase).toBe('ended')
    expect(s.match.endedAt).toBe(PLAY_AT + 5000)
    expect(s.match.outcome).toEqual({ winner: 'a', reason: 'solved' })
    const result = settle(s.match)
    expect(result.outcome).toEqual({ a: 'win', b: 'lose' })
    expect(result.xp).toEqual({ a: 120, b: 40 })
    expect(result.ratingDelta).not.toBeNull()
    const endedA = eventsTo(s.events, 'a').find((m) => m.t === 'ended')
    const endedB = eventsTo(s.events, 'b').find((m) => m.t === 'ended')
    expect(endedA).toMatchObject({
      outcome: 'win',
      reason: 'solved',
      xp: 120,
      secrets: { mine: '1234', theirs: '1234' },
    })
    expect(endedB).toMatchObject({ outcome: 'lose', xp: 40 })
    expect(endedA && 'rating' in endedA && endedA.rating?.delta).toBeGreaterThan(0)
    expect(eventsTo(s.events, 'b')).toContainEqual({
      t: 'oppMoved',
      attempts: 1,
      left: 1,
      solved: true,
    })
  })

  it('gives no rating change in a friendly match', () => {
    const s = guess(raceInPlay('friend'), 'a', '1234', PLAY_AT + 5000)
    expect(settle(s.match).ratingDelta).toBeNull()
    expect(settle(s.match).xp).toEqual({ a: 120, b: 40 })
  })

  it('rejects any guess after the end with ERR_FINISHED', () => {
    const s = guess(raceInPlay(), 'a', '1234', PLAY_AT + 5000)
    expect(errorOf(applyGuess(s.match, s.secrets, 'a', '5678', PLAY_AT + 6000))).toBe(
      'ERR_FINISHED',
    )
    expect(errorOf(applyGuess(s.match, s.secrets, 'b', '5678', PLAY_AT + 6000))).toBe(
      'ERR_FINISHED',
    )
  })
})

describe('race: simultaneous solve (spec §11)', () => {
  const bSolvedAt1000 = () => guess(raceInPlay(), 'b', '1234', PLAY_AT + 1000)

  it('is a draw when both solve in the same millisecond', () => {
    const s = guess(bSolvedAt1000(), 'a', '1234', PLAY_AT + 1000)
    expect(s.match.outcome).toEqual({ winner: null, reason: 'draw' })
    expect(settle(s.match).outcome).toEqual({ a: 'draw', b: 'draw' })
    expect(eventsTo(s.events, 'a').find((m) => m.t === 'ended')).toMatchObject({ outcome: 'draw' })
    expect(eventsTo(s.events, 'b').find((m) => m.t === 'ended')).toMatchObject({ outcome: 'draw' })
    expect(errorOf(applyGuess(s.match, s.secrets, 'a', '5678', PLAY_AT + 1000))).toBe(
      'ERR_FINISHED',
    )
  })

  it('keeps the earlier solver as winner when the later one arrives', () => {
    const b = bSolvedAt1000()
    expect(errorOf(applyGuess(b.match, b.secrets, 'a', '1234', PLAY_AT + 1001))).toBe(
      'ERR_FINISHED',
    )
    expect(b.match.outcome).toEqual({ winner: 'b', reason: 'solved' })
  })

  it('flips the result when a solve stamped strictly earlier is applied later', () => {
    const s = guess(bSolvedAt1000(), 'a', '1234', PLAY_AT + 999)
    expect(s.match.outcome).toEqual({ winner: 'a', reason: 'solved' })
    expect(eventsTo(s.events, 'b').find((m) => m.t === 'ended')).toMatchObject({ outcome: 'lose' })
  })

  it('does not reopen the result for an earlier non-solving guess', () => {
    const b = bSolvedAt1000()
    expect(errorOf(applyGuess(b.match, b.secrets, 'a', '5678', PLAY_AT + 999))).toBe('ERR_FINISHED')
  })
})

describe('classic', () => {
  it('moves to the secrets phase once both are ready', () => {
    const r = readyBoth(lobby('classic'))
    expect(r.match.phase).toBe('secrets')
    expect(r.secrets).toEqual({ shared: null, a: null, b: null })
    expect(r.events).toEqual([])
  })

  it('validates secrets and starts the countdown with a random first mover', () => {
    const r = readyBoth(lobby('classic'))
    expect(errorOf(setSecret(r.match, r.secrets, 'a', '1123', T0, rngZero))).toBe('ERR_CODE')
    const a = ok(setSecret(r.match, r.secrets, 'a', '1234', T0, rngZero))
    expect(a.match.players.a.hasSecret).toBe(true)
    expect(a.match.phase).toBe('secrets')
    const b = ok(setSecret(a.match, a.secrets, 'b', '5678', T0 + 10, rngHigh))
    expect(b.match.phase).toBe('countdown')
    expect(b.match.firstMover).toBe('b')
    expect(b.secrets).toEqual({ shared: null, a: '1234', b: '5678' })
    expect(b.events).toEqual([
      { to: 'both', msg: { t: 'countdown', startAt: T0 + 10 + COUNTDOWN_MS } },
    ])
  })

  it('refuses a secret in a race and before the secrets phase', () => {
    const race = readyBoth(lobby('race'))
    expect(errorOf(setSecret(race.match, race.secrets, 'a', '1234', T0, rngZero))).toBe('ERR_INPUT')
    const g = lobby('classic')
    expect(errorOf(setSecret(g.match, g.secrets, 'a', '1234', T0, rngZero))).toBe('ERR_NOT_STARTED')
  })

  it('gives the first turn to the first mover with a deadline', () => {
    const g = classicInPlay(rngHigh)
    expect(g.match.turn).toBe('b')
    expect(g.match.turnDeadline).toBe(PLAY_AT + TURN_MS)
    expect(errorOf(applyGuess(g.match, g.secrets, 'a', '5678', PLAY_AT + 1))).toBe(
      'ERR_NOT_YOUR_TURN',
    )
  })

  it('checks against the opponent secret and alternates turns', () => {
    const g = classicInPlay()
    expect(errorOf(applyGuess(g.match, g.secrets, 'b', '1234', PLAY_AT + 1))).toBe(
      'ERR_NOT_YOUR_TURN',
    )
    const s = guess(g, 'a', '5687', PLAY_AT + 3000)
    expect(eventsTo(s.events, 'a')[0]).toMatchObject({ t: 'verdict', bulls: 2, cows: 2 })
    expect(s.match.turn).toBe('b')
    expect(s.match.turnDeadline).toBe(PLAY_AT + 3000 + TURN_MS)
    expect(errorOf(applyGuess(s.match, s.secrets, 'a', '5678', PLAY_AT + 4000))).toBe(
      'ERR_NOT_YOUR_TURN',
    )
  })

  const fourEach: readonly [Seat, string][] = [
    ['a', '1235'],
    ['b', '5671'],
    ['a', '1236'],
    ['b', '5672'],
    ['a', '1237'],
    ['b', '5673'],
    ['a', '1239'],
    ['b', '5679'],
  ]

  it('gives b a last move after a solves on move 5; solving it is a draw', () => {
    const g = playAll(classicInPlay(), [...fourEach, ['a', '5678']])
    expect(g.match.phase).toBe('playing')
    expect(g.match.turn).toBe('b')
    const s = guess(g, 'b', '1234', PLAY_AT + 20_000)
    expect(s.match.phase).toBe('ended')
    expect(s.match.outcome).toEqual({ winner: null, reason: 'draw' })
    expect(settle(s.match).xp).toEqual({ a: 70, b: 70 })
  })

  it('gives the win to a when b misses the last move', () => {
    const g = playAll(classicInPlay(), [...fourEach, ['a', '5678']])
    const s = guess(g, 'b', '1243', PLAY_AT + 20_000)
    expect(s.match.outcome).toEqual({ winner: 'a', reason: 'solved' })
    expect(eventsTo(s.events, 'a').find((m) => m.t === 'ended')).toMatchObject({
      outcome: 'win',
      secrets: { mine: '1234', theirs: '5678' },
    })
  })

  it('ends at once when the second mover solves with equal moves', () => {
    const s = playAll(classicInPlay(), [...fourEach.slice(0, 7), ['b', '1234']])
    expect(s.match.outcome).toEqual({ winner: 'b', reason: 'solved' })
  })
})

describe('giveUp', () => {
  it('is a loss for the one who gives up', () => {
    const g = raceInPlay()
    const s = ok(giveUp(g.match, g.secrets, 'b', PLAY_AT + 100))
    expect(s.match.outcome).toEqual({ winner: 'a', reason: 'giveUp' })
    expect(eventsTo(s.events, 'b')).toContainEqual(
      expect.objectContaining({ t: 'ended', outcome: 'lose', reason: 'giveUp' }),
    )
    expect(errorOf(giveUp(s.match, s.secrets, 'a', PLAY_AT + 200))).toBe('ERR_FINISHED')
  })

  it('is not possible in the lobby', () => {
    const g = lobby('race')
    expect(errorOf(giveUp(g.match, g.secrets, 'a', T0))).toBe('ERR_NOT_STARTED')
  })
})
