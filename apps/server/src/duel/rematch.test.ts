import { describe, expect, it } from 'vitest'
import { giveUp } from './match'
import { acceptRematch, expireRematch, offerRematch } from './rematch'
import { PLAY_AT, classicInPlay, errorOf, ok, raceInPlay } from './testing'
import { REMATCH_MS } from './types'

const ended = (format: 'race' | 'classic' = 'race') => {
  const g = format === 'race' ? raceInPlay('quick') : classicInPlay()
  return ok(giveUp(g.match, g.secrets, 'b', PLAY_AT + 100))
}
const AT = PLAY_AT + 1000

describe('rematch', () => {
  it('can only be offered after the end', () => {
    const g = raceInPlay()
    expect(errorOf(offerRematch(g.match, g.secrets, 'a', AT))).toBe('ERR_NOT_STARTED')
  })

  it('sends the offer to both sides', () => {
    const e = ended()
    const o = ok(offerRematch(e.match, e.secrets, 'a', AT))
    expect(o.match.rematch).toEqual({ a: AT + REMATCH_MS, b: null })
    expect(o.events).toEqual([
      { to: 'a', msg: { t: 'rematchOffer', from: 'me', expiresAt: AT + REMATCH_MS } },
      { to: 'b', msg: { t: 'rematchOffer', from: 'opp', expiresAt: AT + REMATCH_MS } },
    ])
  })

  it('needs a live offer from the other side to accept', () => {
    const e = ended()
    expect(errorOf(acceptRematch(e.match, e.secrets, 'b', AT))).toBe('ERR_INPUT')
    const o = ok(offerRematch(e.match, e.secrets, 'a', AT))
    expect(errorOf(acceptRematch(o.match, o.secrets, 'a', AT))).toBe('ERR_INPUT')
    expect(errorOf(acceptRematch(o.match, o.secrets, 'b', AT + REMATCH_MS))).toBe('ERR_INPUT')
  })

  it('starts a fresh friendly match with the same players', () => {
    const e = ended()
    const o = ok(offerRematch(e.match, e.secrets, 'a', AT))
    const r = ok(acceptRematch(o.match, o.secrets, 'b', AT + 5000))
    expect(r.match.phase).toBe('lobby')
    expect(r.match.opponentKind).toBe('friend')
    expect(r.match.outcome).toBeNull()
    expect(r.match.rematch).toEqual({ a: null, b: null })
    expect(r.secrets).toEqual({ shared: null, a: null, b: null })
    expect(r.match.players.a).toMatchObject({ id: 'alice', ready: false, guesses: [], left: 3024 })
    expect(r.match.players.b).toMatchObject({ id: 'bob', ready: false, guesses: [] })
    expect(r.match.players.a.rating.rating).not.toBe(e.match.players.a.rating.rating)
  })

  it('swaps the first mover in classic', () => {
    const e = ended('classic')
    expect(e.match.firstMover).toBe('a')
    const o = ok(offerRematch(e.match, e.secrets, 'b', AT))
    const r = ok(acceptRematch(o.match, o.secrets, 'a', AT))
    expect(r.match.firstMover).toBe('b')
  })

  it('drops offers that have expired', () => {
    const e = ended()
    const o = ok(offerRematch(e.match, e.secrets, 'a', AT))
    expect(ok(expireRematch(o.match, o.secrets, AT + REMATCH_MS - 1)).match.rematch.a).toBe(
      AT + REMATCH_MS,
    )
    expect(ok(expireRematch(o.match, o.secrets, AT + REMATCH_MS)).match.rematch).toEqual({
      a: null,
      b: null,
    })
  })
})
