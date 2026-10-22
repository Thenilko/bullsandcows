import { describe, expect, it } from 'vitest'
import type { PublicGameRow } from '../ports/repo'
import {
  badgeMap,
  badgesFor,
  earnedByDayStreak,
  earnedByGame,
  STREAK_BADGE_DAYS,
  streakOf,
} from './badges'

const T0 = 1_000_000

const game = (over: Partial<PublicGameRow> = {}): PublicGameRow => ({
  id: crypto.randomUUID(),
  userId: 'u1',
  kind: 'free',
  len: 4,
  zero: false,
  dailyDate: null,
  practice: false,
  startedAt: T0,
  finishedAt: T0 + 120_000,
  attempts: 7,
  wasted: 2,
  won: true,
  score: 500,
  suspicious: false,
  createdAt: T0,
  ...over,
})

const never = () => 100

describe('badgesFor', () => {
  it('awards nothing for an empty history', () => {
    expect(badgesFor([], 0, never)).toEqual({
      firstBull: false,
      noWaste: false,
      underMinute: false,
      streak7: false,
      chiefBull: false,
      fiveDigits: false,
    })
  })

  it('awards every per-game badge for one perfect quick five-digit win', () => {
    const win = game({ wasted: 0, len: 5, finishedAt: T0 + 50_000 })
    expect(badgesFor([win], 1, () => 3)).toEqual({
      firstBull: true,
      noWaste: true,
      underMinute: true,
      streak7: false,
      chiefBull: true,
      fiveDigits: true,
    })
  })

  it('awards streak7 from the best day streak only', () => {
    const wins = Array.from({ length: 7 }, () => game())
    expect(badgesFor(wins, 7, never).streak7).toBe(true)
    expect(badgesFor(wins, 6, never).streak7).toBe(false)
    expect(badgesFor([], 9, never).streak7).toBe(true)
  })

  it('ignores losses for the per-game badges', () => {
    const loss = game({ won: false, wasted: 0, len: 5, finishedAt: T0 + 10_000 })
    expect(Object.values(badgesFor([loss], 0, () => 1)).some(Boolean)).toBe(false)
  })

  it('needs strictly under a minute and top 5% or better', () => {
    const minute = game({ finishedAt: T0 + 60_000 })
    expect(badgesFor([minute], 1, () => 6).underMinute).toBe(false)
    expect(badgesFor([minute], 1, () => 6).chiefBull).toBe(false)
    expect(badgesFor([minute], 1, () => 5).chiefBull).toBe(true)
    expect(badgesFor([game({ startedAt: null })], 1, never).underMinute).toBe(false)
  })
})

describe('earnedByGame', () => {
  it('lists what one win earns and nothing for a loss', () => {
    expect(earnedByGame(game({ wasted: 0, len: 5, finishedAt: T0 + 50_000 }), 5)).toEqual([
      'firstBull',
      'noWaste',
      'underMinute',
      'chiefBull',
      'fiveDigits',
    ])
    expect(earnedByGame(game(), 50)).toEqual(['firstBull'])
    expect(earnedByGame(game({ won: false, wasted: 0, len: 5 }), 1)).toEqual([])
  })
})

describe('earnedByDayStreak and badgeMap', () => {
  it('gives streak7 from seven days on', () => {
    expect(STREAK_BADGE_DAYS).toBe(7)
    expect(earnedByDayStreak(6)).toEqual([])
    expect(earnedByDayStreak(7)).toEqual(['streak7'])
  })
  it('maps held keys onto every badge', () => {
    expect(badgeMap(['streak7', 'firstBull', 'firstBull'])).toEqual({
      firstBull: true,
      noWaste: false,
      underMinute: false,
      streak7: true,
      chiefBull: false,
      fiveDigits: false,
    })
  })
})

describe('streakOf', () => {
  it('counts consecutive wins back from the most recent game (newest first)', () => {
    expect(streakOf([])).toBe(0)
    expect(streakOf([game(), game(), game({ won: false }), game()])).toBe(2)
    expect(streakOf([game({ won: false }), game(), game()])).toBe(0)
  })
})
