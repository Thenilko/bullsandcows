import { describe, expect, it } from 'vitest'
import { expire } from './expire'
import { applyGuess } from './guess'
import { markDisconnected, markReconnected } from './match'
import { settle } from './settle'
import { PLAY_AT, classicInPlay, eventsTo, lobby, ok, raceInPlay } from './testing'
import { RACE_CAP_MS, RECONNECT_MS, TURN_MS, TURN_WARN_MS } from './types'

describe('expire', () => {
  it('does nothing when nothing is due', () => {
    const g = classicInPlay()
    const s = ok(expire(g.match, g.secrets, PLAY_AT + 1000))
    expect(s.match).toEqual(g.match)
    expect(s.events).toEqual([])
  })

  it('makes the player on turn lose by timeout when the turn deadline passes', () => {
    const g = classicInPlay()
    const before = structuredClone(g)
    const s = ok(expire(g.match, g.secrets, PLAY_AT + TURN_MS))
    expect(s.match.outcome).toEqual({ winner: 'b', reason: 'timeout' })
    expect(eventsTo(s.events, 'a')).toContainEqual(
      expect.objectContaining({ t: 'ended', outcome: 'lose', reason: 'timeout' }),
    )
    expect(g).toEqual(before)
  })

  it('warns the player on turn once, 15 s before the deadline', () => {
    const g = classicInPlay()
    const early = ok(expire(g.match, g.secrets, PLAY_AT + TURN_MS - TURN_WARN_MS - 1))
    expect(early.events).toEqual([])
    const w = ok(expire(g.match, g.secrets, PLAY_AT + TURN_MS - TURN_WARN_MS))
    expect(w.events).toEqual([{ to: 'a', msg: { t: 'warning', msLeft: TURN_WARN_MS } }])
    expect(w.match.warnedTurnAt).toBe(PLAY_AT + TURN_MS)
    const again = ok(expire(w.match, w.secrets, PLAY_AT + TURN_MS - 1000))
    expect(again.events).toEqual([])
    const next = ok(applyGuess(w.match, w.secrets, 'a', '1235', PLAY_AT + TURN_MS - 500))
    const warnB = ok(expire(next.match, next.secrets, PLAY_AT + 2 * TURN_MS - 500 - TURN_WARN_MS))
    expect(warnB.events).toEqual([{ to: 'b', msg: { t: 'warning', msLeft: TURN_WARN_MS } }])
  })

  it('makes a player lose by disconnect after 30 s without a reconnect', () => {
    const g = raceInPlay()
    const t = PLAY_AT + 5000
    const d = ok(markDisconnected(g.match, g.secrets, 'a', t))
    expect(d.match.players.a).toMatchObject({ connected: false, disconnectedAt: t })
    expect(ok(expire(d.match, d.secrets, t + RECONNECT_MS - 1)).match.phase).toBe('playing')
    const s = ok(expire(d.match, d.secrets, t + RECONNECT_MS + 1))
    expect(s.match.outcome).toEqual({ winner: 'b', reason: 'disconnect' })
  })

  it('forgets the disconnect after a reconnect', () => {
    const g = raceInPlay()
    const t = PLAY_AT + 5000
    const d = ok(markDisconnected(g.match, g.secrets, 'a', t))
    const r = ok(markReconnected(d.match, d.secrets, 'a'))
    expect(r.match.players.a).toMatchObject({ connected: true, disconnectedAt: null })
    const s = ok(expire(r.match, r.secrets, t + RECONNECT_MS + 1))
    expect(s.match.phase).toBe('playing')
    expect(s.events).toEqual([])
  })

  it('keeps the turn clock running for a disconnected player on turn (Review Focus 4)', () => {
    const g = classicInPlay()
    const t = PLAY_AT
    const d = ok(markDisconnected(g.match, g.secrets, 'a', t))
    const s = ok(expire(d.match, d.secrets, t + 60_001))
    expect(s.match.outcome).toEqual({ winner: 'b', reason: 'timeout' })
  })

  it('applies the turn deadline first when it comes before the reconnect window', () => {
    const g = classicInPlay()
    const t = PLAY_AT + TURN_MS - 10_000
    const d = ok(markDisconnected(g.match, g.secrets, 'a', t))
    const s = ok(expire(d.match, d.secrets, PLAY_AT + TURN_MS + 1))
    expect(s.match.outcome).toEqual({ winner: 'b', reason: 'timeout' })
  })

  it('ends a race at the 15 min cap as a draw without rating', () => {
    const g = raceInPlay('quick')
    expect(ok(expire(g.match, g.secrets, PLAY_AT + RACE_CAP_MS - 1)).match.phase).toBe('playing')
    const s = ok(expire(g.match, g.secrets, PLAY_AT + RACE_CAP_MS + 1))
    expect(s.match.outcome).toEqual({ winner: null, reason: 'cap' })
    const result = settle(s.match)
    expect(result.outcome).toEqual({ a: 'draw', b: 'draw' })
    expect(result.ratingDelta).toBeNull()
    expect(eventsTo(s.events, 'a')).toContainEqual(
      expect.objectContaining({ t: 'ended', outcome: 'draw', reason: 'cap', rating: null, xp: 70 }),
    )
  })

  it('is a no-op once ended and in the lobby', () => {
    const g = raceInPlay()
    const done = ok(expire(g.match, g.secrets, PLAY_AT + RACE_CAP_MS))
    const again = ok(expire(done.match, done.secrets, PLAY_AT + 10 * RACE_CAP_MS))
    expect(again.match).toEqual(done.match)
    expect(again.events).toEqual([])
    const l = lobby('race')
    expect(ok(expire(l.match, l.secrets, PLAY_AT + RACE_CAP_MS)).events).toEqual([])
  })
})
