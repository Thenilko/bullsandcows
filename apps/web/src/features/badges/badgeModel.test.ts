import { describe, expect, it } from 'vitest'
import { badgesFixture } from '../../test/fixtures'
import { badgeView, badgeViews, collectionSummary, groupBadges, viewOfNew } from './badgeModel'

const state = (key: 'noWaste' | 'allCows' | 'mirror' | 'streak' | 'invite', tier: number, progress: number, next: number | null) => ({
  key,
  tier,
  progress,
  next,
  earnedAt: tier > 0 ? 1 : null,
})

describe('badgeView', () => {
  it('maps a tiered badge at silver: medallion, pips, steps and the progress fraction', () => {
    const v = badgeView(state('noWaste', 2, 14, 50))
    expect(v.single).toBe(false)
    expect(v.locked).toBe(false)
    expect(v.tierName).toBe('silver')
    expect(v.md).toBe('md-silver')
    expect(v.pips).toEqual(['on1', 'on2', ''])
    expect(v.steps.map((s) => [s.tierName, s.threshold, s.done])).toEqual([
      ['bronze', 1, true],
      ['silver', 10, true],
      ['gold', 50, false],
    ])
    expect(v.fraction).toBeCloseTo(14 / 50)
    expect(v.unit).toBe('times')
  })

  it('draws a single badge gold once earned, grey before', () => {
    const earned = badgeView(state('allCows', 1, 1, null))
    expect(earned.single).toBe(true)
    expect(earned.md).toBe('md-gold')
    expect(earned.tierName).toBe('gold')
    expect(earned.pips).toEqual(['on3'])
    expect(earned.steps).toEqual([{ tierName: 'gold', threshold: 1, done: true, md: 'md-gold' }])
    expect(earned.fraction).toBe(1)
    const locked = badgeView(state('allCows', 0, 0, 1))
    expect(locked.md).toBe('md-none')
    expect(locked.pips).toEqual([''])
    expect(locked.fraction).toBe(0)
  })

  it('keeps a hidden badge secret until earned', () => {
    expect(badgeView(state('mirror', 0, 0, 1)).secret).toBe(true)
    expect(badgeView(state('mirror', 1, 1, null)).secret).toBe(false)
  })

  it('counts days for the streak', () => {
    expect(badgeView(state('streak', 1, 9, 30)).unit).toBe('days')
  })
})

describe('badgeViews / groupBadges / collectionSummary', () => {
  it('lists all 29 in the order of the definitions, missing ones at tier 0', () => {
    const views = badgeViews([state('noWaste', 2, 14, 50)])
    expect(views).toHaveLength(29)
    expect(views[0]?.key).toBe('noWaste')
    expect(views[0]?.tier).toBe(2)
    expect(views[1]?.tier).toBe(0)
    expect(views[1]?.next).toBe(1)
    expect(badgeViews(undefined).every((v) => v.locked)).toBe(true)
  })

  it('groups into the 8 categories with their earned counts', () => {
    const groups = groupBadges(badgeViews(badgesFixture))
    expect(groups.map((g) => [g.category, g.items.length, g.earned])).toEqual([
      ['logic', 6, 4],
      ['speed', 2, 2],
      ['consistency', 4, 2],
      ['duel', 4, 4],
      ['bot', 4, 2],
      ['collector', 2, 1],
      ['together', 4, 1],
      ['hidden', 3, 0],
    ])
  })

  it('sums badges and tiers for the collection card', () => {
    expect(collectionSummary(badgeViews(badgesFixture))).toEqual({ earned: 16, total: 29, tiers: 19, left: 13, fraction: 16 / 29 })
  })
})

describe('viewOfNew', () => {
  it('synthesises the just-earned tier when the list is stale', () => {
    const v = viewOfNew({ key: 'noWaste', tier: 2 }, [state('noWaste', 1, 9, 10)])
    expect(v.tier).toBe(2)
    expect(v.progress).toBe(10)
    expect(v.next).toBe(50)
  })

  it('prefers a fresher server state', () => {
    const v = viewOfNew({ key: 'noWaste', tier: 2 }, [state('noWaste', 2, 14, 50)])
    expect(v.progress).toBe(14)
  })
})
