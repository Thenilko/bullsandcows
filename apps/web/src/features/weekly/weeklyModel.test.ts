import { describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { attemptDots, betterThan, ctaOf, ruleChips, timeLeft, weekDates } from './weeklyModel'

const t = i18n.getFixedT('bg')

describe('weeklyModel', () => {
  it('shows the time left in days, hours or minutes', () => {
    const now = 0
    expect(timeLeft(t, now + (3 * 24 + 4) * 3_600_000 + 5, now)).toBe('3д 4ч')
    expect(timeLeft(t, now + 5 * 3_600_000 + 12 * 60_000, now)).toBe('5ч 12м')
    expect(timeLeft(t, now + 30_000, now)).toBe('1 мин')
    expect(timeLeft(t, now - 1, now)).toBe('1 мин')
  })

  it('writes the week as the artboard does', () => {
    expect(weekDates('2026-10-19', '2026-10-25', 'bg')).toBe('19–25 окт')
    expect(weekDates('2026-10-26', '2026-11-01', 'bg')).toBe('26 окт – 1 ное')
  })

  it('lists the chips of a rule', () => {
    expect(
      ruleChips(t, { key: 'fiveZero', len: 5, zero: true, maxAttempts: 8, timeLimitSecs: null }),
    ).toEqual(['5 цифри', 'може и 0', 'до 8 опита'])
    expect(
      ruleChips(t, { key: 'quickFour', len: 4, zero: false, maxAttempts: 10, timeLimitSecs: 180 }),
    ).toContain('до 3 мин')
  })

  it('allows one game a day', () => {
    expect(ctaOf({ playedToday: false, today: null })).toBe('play')
    expect(ctaOf({ playedToday: false, today: { gameId: 'g', finished: false } })).toBe('resume')
    expect(ctaOf({ playedToday: true, today: { gameId: 'g', finished: true } })).toBe('tomorrow')
  })

  it('marks the dots used, current and remaining', () => {
    expect(attemptDots(3, 8, false)).toEqual(['used', 'used', 'used', 'cur', '', '', '', ''])
    expect(attemptDots(8, 8, true)).toEqual(Array(8).fill('used'))
  })

  it('computes „better than“', () => {
    expect(betterThan(12, 340)).toBe(96)
    expect(betterThan(1, 1)).toBeNull()
  })
})
