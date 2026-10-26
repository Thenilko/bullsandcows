import { describe, expect, it } from 'vitest'
import { dailyXp, dayStreakBonus, FREE_XP_GAMES_PER_DAY, freeXp } from './xp'

describe('dailyXp', () => {
  it('gives 150 plus 20 per star', () => {
    expect(dailyXp(1)).toBe(170)
    expect(dailyXp(5)).toBe(250)
  })
  it('adds the day-streak bonus', () => {
    expect(dailyXp(3, 1)).toBe(220)
    expect(dailyXp(3, 7)).toBe(280)
  })
})

describe('dayStreakBonus', () => {
  it('gives 10 XP per day in the streak, at most 70', () => {
    expect(dayStreakBonus(0)).toBe(0)
    expect(dayStreakBonus(1)).toBe(10)
    expect(dayStreakBonus(7)).toBe(70)
    expect(dayStreakBonus(30)).toBe(70)
  })
})

describe('freeXp', () => {
  it('gives 40 plus 12 per star for the first ten free games of a day', () => {
    expect(FREE_XP_GAMES_PER_DAY).toBe(10)
    expect(freeXp(1, 1)).toBe(52)
    expect(freeXp(5, 10)).toBe(100)
  })
  it('gives 10 XP from the eleventh free game of the day on', () => {
    expect(freeXp(5, 11)).toBe(10)
    expect(freeXp(1, 40)).toBe(10)
  })
})
