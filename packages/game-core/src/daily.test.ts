import { describe, expect, it } from 'vitest'
import { codes, isValidCode, totalCodes } from './codes'
import { dailyIndex, dailySecret, sofiaDate } from './daily'

describe('sofiaDate', () => {
  it('uses UTC+3 in summer', () => {
    expect(sofiaDate(new Date('2026-06-30T21:30:00Z'))).toBe('2026-07-01')
  })
  it('uses UTC+2 in winter', () => {
    expect(sofiaDate(new Date('2026-01-10T21:30:00Z'))).toBe('2026-01-10')
  })
})

describe('dailyIndex', () => {
  it('is an integer within [0, total) and deterministic', () => {
    const a = dailyIndex('s', '2026-10-20', 4, false)
    expect(Number.isInteger(a)).toBe(true)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(3024)
    expect(dailyIndex('s', '2026-10-20', 4, false)).toBe(a)
  })
  it('differs for zero, length, salt and date', () => {
    const base = dailyIndex('s', '2026-10-20', 4, false)
    expect(dailyIndex('s', '2026-10-20', 4, true)).not.toBe(base)
    expect(dailyIndex('s', '2026-10-20', 5, false)).not.toBe(base)
    expect(dailyIndex('other', '2026-10-20', 4, false)).not.toBe(base)
    expect(dailyIndex('s', '2026-10-21', 4, false)).not.toBe(base)
  })
  it('stays below the total for every length', () => {
    for (const len of [3, 4, 5] as const) {
      for (const zero of [false, true]) {
        expect(dailyIndex('s', '2026-10-20', len, zero)).toBeLessThan(totalCodes(len, zero))
      }
    }
  })
})

describe('dailySecret', () => {
  it('returns a valid code matching the index', () => {
    const s = dailySecret('s', '2026-10-20', 4, true)
    expect(isValidCode(s, 4, true)).toBe(true)
    expect(s).toBe(codes(4, true)[dailyIndex('s', '2026-10-20', 4, true)])
  })
})
