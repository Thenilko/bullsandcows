import { describe, expect, it } from 'vitest'
import {
  BOT_WIN_XP,
  DUEL_XP,
  LEN_FACTOR,
  RANK_KEYS,
  XP_PER_LEVEL,
  duelXp,
  levelFromXp,
  rankKeyForLevel,
  rankKeyForStars,
  scoreSolo,
  starsFromTop,
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
  it('has 1500 XP per level', () => {
    expect(XP_PER_LEVEL).toBe(1500)
  })
  it.each([
    [0, 1],
    [1499, 1],
    [1500, 2],
    [10500, 8],
  ] as const)('levelFromXp(%i) = %i', (xp, level) => {
    expect(levelFromXp(xp)).toBe(level)
  })
  it('computes XP into the level', () => {
    expect(xpIntoLevel(1700)).toBe(200)
  })
})

describe('ranks', () => {
  it('lists six rank keys', () => {
    expect(RANK_KEYS).toEqual(['calf', 'herdsman', 'shepherd', 'pastor', 'steward', 'chiefBull'])
  })
  it('maps level and stars to rank keys', () => {
    expect(rankKeyForLevel(9)).toBe('chiefBull')
    expect(rankKeyForLevel(0)).toBe('calf')
    expect(rankKeyForStars(0)).toBe('calf')
    expect(rankKeyForStars(3)).toBe('pastor')
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
