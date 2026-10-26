import { describe, expect, it } from 'vitest'
import { dayStreakFromDates, nextDayStreak, previousDate } from './streak'

const none = { currentStreak: 0, bestStreak: 0, streakDate: null }

describe('previousDate', () => {
  it('steps one calendar day back, across months and years', () => {
    expect(previousDate('2026-10-21')).toBe('2026-10-20')
    expect(previousDate('2026-03-01')).toBe('2026-02-28')
    expect(previousDate('2028-03-01')).toBe('2028-02-29')
    expect(previousDate('2027-01-01')).toBe('2026-12-31')
  })
})

describe('nextDayStreak', () => {
  it('starts a streak of one on the first won day', () => {
    expect(nextDayStreak(none, '2026-10-20')).toEqual({
      currentStreak: 1,
      bestStreak: 1,
      streakDate: '2026-10-20',
    })
  })

  it('extends the streak on the next day and keeps the best', () => {
    const day1 = nextDayStreak(none, '2026-10-20')
    const day2 = nextDayStreak(day1, '2026-10-21')
    expect(day2).toEqual({ currentStreak: 2, bestStreak: 2, streakDate: '2026-10-21' })
  })

  it('does not count a second win on the same day', () => {
    const day1 = nextDayStreak(none, '2026-10-20')
    expect(nextDayStreak(day1, '2026-10-20')).toEqual(day1)
  })

  it('resets to one after a missed day, remembering the best', () => {
    const run = { currentStreak: 5, bestStreak: 5, streakDate: '2026-10-20' }
    expect(nextDayStreak(run, '2026-10-22')).toEqual({
      currentStreak: 1,
      bestStreak: 5,
      streakDate: '2026-10-22',
    })
  })

  it('ignores a win for a day before the streak date', () => {
    const run = { currentStreak: 2, bestStreak: 2, streakDate: '2026-10-21' }
    expect(nextDayStreak(run, '2026-10-20')).toEqual(run)
  })
})

describe('dayStreakFromDates', () => {
  it('is empty without dates', () => {
    expect(dayStreakFromDates([])).toEqual(none)
  })

  it('finds the current run ending at the latest date and the best run', () => {
    const dates = [
      '2026-10-21',
      '2026-10-20',
      '2026-10-20', // a second length that day
      '2026-10-17',
      '2026-10-16',
      '2026-10-15',
      '2026-10-01',
    ]
    expect(dayStreakFromDates(dates)).toEqual({
      currentStreak: 2,
      bestStreak: 3,
      streakDate: '2026-10-21',
    })
  })
})
