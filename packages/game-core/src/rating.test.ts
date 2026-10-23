import { describe, expect, it } from 'vitest'
import { DEFAULT_RATING, displayRating, updateRating, type Rating } from './rating'

describe('DEFAULT_RATING', () => {
  it('is 1500 / 350 / 0.06', () => {
    expect(DEFAULT_RATING).toEqual({ rating: 1500, rd: 350, vol: 0.06 })
  })
})

describe('updateRating', () => {
  it('raises the winner and lowers the loser', () => {
    const r = updateRating(DEFAULT_RATING, DEFAULT_RATING, 'win')
    expect(r.me.rating).toBeGreaterThan(1500)
    expect(r.opp.rating).toBeLessThan(1500)
  })

  it('mirrors the change between equal players', () => {
    const r = updateRating(DEFAULT_RATING, DEFAULT_RATING, 'win')
    expect(r.me.rating - 1500).toBeCloseTo(1500 - r.opp.rating, 6)
  })

  it('swaps sides consistently on a loss', () => {
    const r = updateRating(DEFAULT_RATING, DEFAULT_RATING, 'lose')
    expect(r.me.rating).toBeLessThan(1500)
    expect(r.opp.rating).toBeGreaterThan(1500)
  })

  it('keeps equal players within 1 point on a draw and shrinks the deviation', () => {
    const r = updateRating(DEFAULT_RATING, DEFAULT_RATING, 'draw')
    expect(Math.abs(r.me.rating - 1500)).toBeLessThanOrEqual(1)
    expect(Math.abs(r.opp.rating - 1500)).toBeLessThanOrEqual(1)
    expect(r.me.rd).toBeLessThan(350)
  })

  it('does not mutate its inputs and returns new objects', () => {
    const me: Rating = { rating: 1500, rd: 350, vol: 0.06 }
    const opp: Rating = { rating: 1500, rd: 350, vol: 0.06 }
    const r = updateRating(me, opp, 'win')
    expect(me).toEqual({ rating: 1500, rd: 350, vol: 0.06 })
    expect(opp).toEqual({ rating: 1500, rd: 350, vol: 0.06 })
    expect(r.me).not.toBe(me)
    expect(Object.keys(r.me).sort()).toEqual(['rating', 'rd', 'vol'])
  })

  it('rewards an upset more than an expected win', () => {
    const strong: Rating = { rating: 1800, rd: 80, vol: 0.06 }
    const weak: Rating = { rating: 1400, rd: 80, vol: 0.06 }
    const upset = updateRating(weak, strong, 'win').me.rating - weak.rating
    const expected = updateRating(strong, weak, 'win').me.rating - strong.rating
    expect(upset).toBeGreaterThan(expected)
  })
})

describe('displayRating', () => {
  it('rounds to an integer', () => {
    expect(displayRating({ rating: 1523.6, rd: 100, vol: 0.06 })).toBe(1524)
    expect(displayRating({ rating: 1523.4, rd: 100, vol: 0.06 })).toBe(1523)
  })
})
