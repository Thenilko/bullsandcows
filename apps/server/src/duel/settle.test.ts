import { updateRating } from '@bc/game-core'
import { describe, expect, it } from 'vitest'
import { giveUp } from './match'
import { settle } from './settle'
import { PLAY_AT, alice, bob, lobby, ok, raceInPlay } from './testing'
import type { Match } from './types'

const endedBy = (kind: 'quick' | 'friend' | 'bot', loser: 'a' | 'b' = 'b'): Match => {
  const g = raceInPlay(kind)
  return ok(giveUp(g.match, g.secrets, loser, PLAY_AT + 100)).match
}

describe('settle', () => {
  it('updates both ratings in a quick match and reports rounded display values', () => {
    const r = settle(endedBy('quick'))
    const expected = updateRating(alice.rating, bob.rating, 'win')
    expect(r.ratings).toEqual({ a: expected.me, b: expected.opp })
    expect(r.ratingDelta).toEqual({
      a: {
        from: 1500,
        to: Math.round(expected.me.rating),
        delta: Math.round(expected.me.rating) - 1500,
      },
      b: {
        from: 1600,
        to: Math.round(expected.opp.rating),
        delta: Math.round(expected.opp.rating) - 1600,
      },
    })
    expect(r.ratingDelta?.a.delta).toBeGreaterThan(0)
    expect(r.ratingDelta?.b.delta).toBeLessThan(0)
  })

  it('reports the loser side of the duel xp', () => {
    expect(settle(endedBy('friend', 'a')).xp).toEqual({ a: 40, b: 120 })
    expect(settle(endedBy('friend', 'a')).outcome).toEqual({ a: 'lose', b: 'win' })
  })

  it('never touches the rating outside quick matches', () => {
    expect(settle(endedBy('friend')).ratingDelta).toBeNull()
    expect(settle(endedBy('friend')).ratings).toBeNull()
    expect(settle(endedBy('bot')).ratingDelta).toBeNull()
  })

  it('gives bot xp only for a win at level 3 or 4', () => {
    const vsBot = (level: 1 | 2 | 3 | 4) => ({ ...endedBy('bot'), botLevel: level })
    expect(settle(vsBot(3)).xp.a).toBe(40)
    expect(settle(vsBot(4)).xp.a).toBe(40)
    expect(settle(vsBot(1)).xp.a).toBe(0)
    expect(settle({ ...vsBot(4), outcome: { winner: 'b', reason: 'giveUp' } }).xp.a).toBe(0)
  })

  it('refuses to settle a match that has not ended', () => {
    expect(() => settle(lobby('race').match)).toThrow()
  })
})
