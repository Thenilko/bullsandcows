import { describe, expect, it } from 'vitest'
import {
  BADGE_CATEGORIES,
  BADGE_GLYPHS,
  BADGE_KEYS,
  BADGES,
  BADGES_BY_CATEGORY,
  badgeDef,
  isBadgeKey,
  isTiered,
  maxTier,
  nextThreshold,
  tierFor,
} from './badges'

describe('BADGES', () => {
  it('defines the 29 keys of the spec in 8 groups, once each, in key order', () => {
    expect(BADGES).toHaveLength(29)
    expect(BADGES.map((b) => b.key)).toEqual([...BADGE_KEYS])
    expect(new Set(BADGE_KEYS).size).toBe(29)
    expect([...BADGES_BY_CATEGORY.entries()].map(([c, b]) => [c, b.length])).toEqual([
      ['logic', 6],
      ['speed', 2],
      ['consistency', 4],
      ['duel', 4],
      ['bot', 4],
      ['collector', 2],
      ['together', 4],
      ['hidden', 3],
    ])
    expect(BADGE_CATEGORIES).toHaveLength(8)
  })

  it('uses the thresholds of the spec', () => {
    const thresholds = Object.fromEntries(BADGES.map((b) => [b.key, b.thresholds]))
    expect(thresholds).toEqual({
      noWaste: [1, 10, 50],
      sherlock: [1, 5, 25],
      allCows: [1],
      lucky: [1],
      five: [1, 10, 50],
      pure: [1, 10, 25],
      underMinute: [1, 10, 50],
      bolt: [1, 5, 25],
      streak: [7, 30, 100],
      early: [1, 10, 30],
      night: [1, 10, 30],
      month: [1],
      duelist: [1, 10, 100],
      unbeaten: [5, 10, 20],
      comeback: [1],
      rematch: [1, 10, 50],
      bot1: [1],
      bot2: [1],
      bot3: [1],
      bot4: [1],
      formats: [6],
      notes: [10, 50, 200],
      invite: [1, 5, 20],
      family: [1],
      teller: [5, 25, 100],
      weekly: [1, 4, 12],
      mirror: [1],
      ladder: [1],
      zeroHero: [1],
    })
    for (const b of BADGES) {
      expect([1, 3], b.key).toContain(b.thresholds.length)
      expect(
        [...b.thresholds].sort((x, y) => x - y),
        b.key,
      ).toEqual([...b.thresholds])
    }
  })

  it('marks the unavailable and the hidden ones', () => {
    expect(BADGES.filter((b) => !b.available).map((b) => b.key)).toEqual([])
    expect(BADGES.filter((b) => b.hidden).map((b) => b.key)).toEqual([
      'mirror',
      'ladder',
      'zeroHero',
    ])
  })

  it('points every badge at an i18n pair and a glyph', () => {
    for (const b of BADGES) {
      expect(b.nameKey).toBe(`badge.${b.key}.name`)
      expect(b.descKey).toBe(`badge.${b.key}.desc`)
      expect(b.glyph in BADGE_GLYPHS, b.key).toBe(true)
    }
    expect(badgeDef('allCows').glyph).toBe('cow')
    expect(BADGES.filter((b) => b.glyph === 'scarecrow').map((b) => b.key)).toEqual([
      'bot1',
      'bot2',
      'bot3',
      'bot4',
    ])
    expect(BADGE_GLYPHS.check).toMatch(/^M/)
  })
})

describe('tiers', () => {
  const tiered = badgeDef('noWaste')
  const single = badgeDef('lucky')

  it('gives bronze, silver and gold at the thresholds', () => {
    expect([0, 1, 9, 10, 49, 50, 500].map((p) => tierFor(tiered, p))).toEqual([0, 1, 1, 2, 2, 3, 3])
    expect(isTiered(tiered)).toBe(true)
    expect(maxTier(tiered)).toBe(3)
  })

  it('gives a single badge one tier only', () => {
    expect([0, 1, 7].map((p) => tierFor(single, p))).toEqual([0, 1, 1])
    expect(isTiered(single)).toBe(false)
    expect(maxTier(single)).toBe(1)
  })

  it('names the next threshold until every tier is earned', () => {
    expect([0, 1, 2, 3].map((t) => nextThreshold(tiered, t))).toEqual([1, 10, 50, null])
    expect([0, 1].map((t) => nextThreshold(single, t))).toEqual([1, null])
    expect(nextThreshold(badgeDef('streak'), 0)).toBe(7)
  })

  it('looks badges up by key', () => {
    expect(badgeDef('bot3').category).toBe('bot')
    expect(isBadgeKey('bot3')).toBe(true)
    expect(isBadgeKey('firstBull')).toBe(false)
    expect(() => badgeDef('firstBull' as never)).toThrow()
  })
})
