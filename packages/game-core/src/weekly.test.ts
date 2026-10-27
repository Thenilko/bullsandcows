import { describe, expect, it } from 'vitest'
import { codes, isValidCode } from './codes'
import {
  WEEKLY_RULES,
  compareWeekly,
  isoWeekOf,
  nextWeek,
  parseWeekId,
  sofiaMidnight,
  sofiaWeekAt,
  weekInfo,
  weeklyRule,
  weeksInIsoYear,
} from './weekly'

const HOUR = 3_600_000

describe('isoWeekOf', () => {
  it('numbers weeks from the week with the first Thursday', () => {
    expect(isoWeekOf('2026-10-26')).toEqual({ isoYear: 2026, week: 44 })
    expect(isoWeekOf('2026-10-25')).toEqual({ isoYear: 2026, week: 43 })
    // 1 January 2027 is a Friday: it still belongs to 2026-W53.
    expect(isoWeekOf('2027-01-01')).toEqual({ isoYear: 2026, week: 53 })
    expect(isoWeekOf('2027-01-04')).toEqual({ isoYear: 2027, week: 1 })
    // 29 December 2025 is a Monday of 2026-W01.
    expect(isoWeekOf('2025-12-29')).toEqual({ isoYear: 2026, week: 1 })
  })

  it('knows long years', () => {
    expect(weeksInIsoYear(2026)).toBe(53)
    expect(weeksInIsoYear(2027)).toBe(52)
  })
})

describe('parseWeekId', () => {
  it('accepts real weeks only', () => {
    expect(parseWeekId('2026-W44')).toEqual({ isoYear: 2026, week: 44 })
    expect(parseWeekId('2026-W53')).toEqual({ isoYear: 2026, week: 53 })
    expect(parseWeekId('2027-W53')).toBeNull()
    expect(parseWeekId('2026-W00')).toBeNull()
    expect(parseWeekId('2026-44')).toBeNull()
    expect(parseWeekId("2026-W44' or 1=1")).toBeNull()
  })
})

describe('the Sofia week', () => {
  it('starts at Monday 00:00 Sofia and ends at the next Monday 00:00', () => {
    const w = weekInfo({ isoYear: 2026, week: 44 })
    expect(w.id).toBe('2026-W44')
    expect(w.monday).toBe('2026-10-26')
    expect(w.sunday).toBe('2026-11-01')
    // Winter time (UTC+2) all week.
    expect(new Date(w.startsAt).toISOString()).toBe('2026-10-25T22:00:00.000Z')
    expect(new Date(w.endsAt).toISOString()).toBe('2026-11-01T22:00:00.000Z')
  })

  it('is one hour longer in the week the clocks go back (2026-10-25)', () => {
    const w = weekInfo({ isoYear: 2026, week: 43 })
    expect(new Date(w.startsAt).toISOString()).toBe('2026-10-18T21:00:00.000Z')
    expect(new Date(w.endsAt).toISOString()).toBe('2026-10-25T22:00:00.000Z')
    expect(w.endsAt - w.startsAt).toBe(7 * 24 * HOUR + HOUR)
  })

  it('puts the last second of Sunday in the old week and midnight in the new one', () => {
    // Sunday 2026-10-25 23:59:59 EET = 21:59:59Z (after the switch at 04:00 EEST).
    expect(sofiaWeekAt(Date.parse('2026-10-25T21:59:59Z')).id).toBe('2026-W43')
    expect(sofiaWeekAt(Date.parse('2026-10-25T22:00:00Z')).id).toBe('2026-W44')
    // Monday 2026-10-19 00:00 EEST = 18 Oct 21:00Z.
    expect(sofiaWeekAt(Date.parse('2026-10-18T20:59:59Z')).id).toBe('2026-W42')
    expect(sofiaWeekAt(Date.parse('2026-10-18T21:00:00Z')).id).toBe('2026-W43')
  })

  it('is one hour shorter in the spring', () => {
    const w = weekInfo(isoWeekOf('2027-03-28'))
    expect(w.endsAt - w.startsAt).toBe(7 * 24 * HOUR - HOUR)
  })

  it('finds midnight on both sides of the switch', () => {
    expect(new Date(sofiaMidnight('2026-10-25')).toISOString()).toBe('2026-10-24T21:00:00.000Z')
    expect(new Date(sofiaMidnight('2026-10-26')).toISOString()).toBe('2026-10-25T22:00:00.000Z')
  })

  it('steps over the year boundary', () => {
    expect(nextWeek({ isoYear: 2026, week: 53 }).id).toBe('2027-W01')
    expect(nextWeek({ isoYear: 2026, week: 44 }).id).toBe('2026-W45')
  })
})

describe('weeklyRule', () => {
  it('rotates with (isoWeek + isoYear) % 4', () => {
    expect(weeklyRule({ isoYear: 2026, week: 44 }).key).toBe('quickFour')
    expect(weeklyRule({ isoYear: 2026, week: 45 }).key).toBe('fourZero')
    expect(weeklyRule({ isoYear: 2026, week: 46 }).key).toBe('fiveZero')
    expect(weeklyRule({ isoYear: 2026, week: 47 }).key).toBe('threeNoZero')
    expect(weeklyRule({ isoYear: 2027, week: 44 }).key).toBe('fourZero')
  })

  it('matches the table of the spec', () => {
    expect(WEEKLY_RULES.map((r) => [r.key, r.len, r.zero, r.maxAttempts, r.timeLimitSecs])).toEqual(
      [
        ['fiveZero', 5, true, 8, null],
        ['threeNoZero', 3, false, 6, null],
        ['quickFour', 4, false, 10, 180],
        ['fourZero', 4, true, 9, null],
      ],
    )
  })

  it('lets 0 lead the number in the rules with zero', () => {
    for (const rule of WEEKLY_RULES.filter((r) => r.zero)) {
      expect(codes(rule.len, true).some((c) => c.startsWith('0'))).toBe(true)
      expect(isValidCode('0'.concat('12345'.slice(0, rule.len - 1)), rule.len, true)).toBe(true)
    }
    expect(isValidCode('012', 3, false)).toBe(false)
  })
})

describe('compareWeekly', () => {
  it('ranks a win over a loss, then fewer attempts, then less time', () => {
    const sorted = [
      { won: false, attempts: 2, secs: 10 },
      { won: true, attempts: 6, secs: 30 },
      { won: true, attempts: 5, secs: 200 },
      { won: true, attempts: 5, secs: 90 },
      { won: true, attempts: 5, secs: null },
    ].sort(compareWeekly)
    expect(sorted).toEqual([
      { won: true, attempts: 5, secs: 90 },
      { won: true, attempts: 5, secs: 200 },
      { won: true, attempts: 5, secs: null },
      { won: true, attempts: 6, secs: 30 },
      { won: false, attempts: 2, secs: 10 },
    ])
  })
})
