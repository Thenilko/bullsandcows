import { describe, expect, it } from 'vitest'
import {
  BOT_WIN_XP,
  DUEL_XP,
  LEN_FACTOR,
  RANK_KEYS,
  duelXp,
  levelFromXp,
  rankKeyForGuest,
  rankKeyForLevel,
  rankKeyForStars,
  scoreSolo,
  starsFromTop,
  xpForLevel,
  xpForNextLevel,
  xpIntoLevel,
} from './scoring'

describe('scoreSolo', () => {
  it('exposes length factors', () => {
    expect(LEN_FACTOR).toEqual({ 3: 0.8, 4: 1, 5: 1.3 })
  })
  it.each([
    [1, 0, 4, 1200],
    [6, 40, 4, 690],
    [6, 40, 3, 552],
    [6, 40, 5, 897],
    [20, 900, 4, 50],
  ] as const)('scoreSolo(%i, %i, %i) = %i', (attempts, secs, len, expected) => {
    expect(scoreSolo(attempts, secs, len)).toBe(expected)
  })
})

describe('starsFromTop', () => {
  it.each([
    [5, 5],
    [5.1, 4],
    [20, 4],
    [45, 3],
    [75, 2],
    [100, 1],
  ] as const)('starsFromTop(%d) = %i', (top, stars) => {
    expect(starsFromTop(top)).toBe(stars)
  })
})

describe('levels and XP', () => {
  it('costs 500 XP for level 2 and 250 more for each level after', () => {
    expect([1, 2, 3, 4, 10].map(xpForNextLevel)).toEqual([500, 750, 1000, 1250, 2750])
  })
  it('sums the costs into the XP at which a level is reached', () => {
    expect([1, 2, 3, 4, 5, 35].map(xpForLevel)).toEqual([0, 500, 1250, 2250, 3500, 157_250])
  })
  it.each([
    [0, 1],
    [499, 1],
    [500, 2],
    [1249, 2],
    [1250, 3],
    [2249, 3],
    [2250, 4],
    [3499, 4],
    [3500, 5],
    [157_249, 34],
    [157_250, 35],
  ] as const)('levelFromXp(%i) = %i', (xp, level) => {
    expect(levelFromXp(xp)).toBe(level)
  })
  it('has no level cap', () => {
    expect(levelFromXp(xpForLevel(1000))).toBe(1000)
    expect(levelFromXp(xpForLevel(1000) - 1)).toBe(999)
  })
  it('computes XP into the level', () => {
    expect(xpIntoLevel(0)).toBe(0)
    expect(xpIntoLevel(499)).toBe(499)
    expect(xpIntoLevel(500)).toBe(0)
    expect(xpIntoLevel(1700)).toBe(450)
  })
})

describe('ranks', () => {
  it('lists six rank keys', () => {
    expect(RANK_KEYS).toEqual(['calf', 'herdsman', 'shepherd', 'pastor', 'steward', 'chiefBull'])
  })
  it.each([
    [1, 'herdsman'],
    [4, 'herdsman'],
    [5, 'shepherd'],
    [9, 'shepherd'],
    [10, 'pastor'],
    [19, 'pastor'],
    [20, 'steward'],
    [34, 'steward'],
    [35, 'chiefBull'],
    [80, 'chiefBull'],
  ] as const)('rankKeyForLevel(%i) = %s', (level, key) => {
    expect(rankKeyForLevel(level)).toBe(key)
  })
  it('never makes a level a calf; guests are calves', () => {
    expect(rankKeyForLevel(0)).toBe('herdsman')
    expect(rankKeyForGuest()).toBe('calf')
  })
  it('maps stars to rank keys', () => {
    expect(rankKeyForStars(0)).toBe('calf')
    expect(rankKeyForStars(3)).toBe('pastor')
    expect(rankKeyForStars(5)).toBe('chiefBull')
  })
})

describe('duelXp', () => {
  it('exposes constants', () => {
    expect(DUEL_XP).toEqual({ win: 120, draw: 70, lose: 40 })
    expect(BOT_WIN_XP).toBe(40)
  })
  it.each([
    ['win', 'quick', undefined, 120],
    ['draw', 'friend', undefined, 70],
    ['lose', 'quick', undefined, 40],
    ['win', 'bot', 2, 0],
    ['win', 'bot', 3, 40],
    ['lose', 'bot', 4, 0],
  ] as const)('duelXp(%s, %s, %s) = %i', (outcome, kind, botLevel, expected) => {
    expect(duelXp(outcome, kind, botLevel)).toBe(expected)
  })
})
