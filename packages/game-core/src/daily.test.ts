import { describe, expect, it } from 'vitest'
import { codes, isValidCode, totalCodes } from './codes'
import { LAUNCH_DATE, dailyIndex, dailyNumber, dailySecret, sofiaDate } from './daily'

describe('sofiaDate', () => {
  it('uses UTC+3 in summer', () => {
    expect(sofiaDate(new Date('2026-06-30T21:30:00Z'))).toBe('2026-07-01')
  })
  it('uses UTC+2 in winter', () => {
    expect(sofiaDate(new Date('2026-01-10T21:30:00Z'))).toBe('2026-01-10')
  })
})

describe('dailyNumber', () => {
  it('counts from #1 on the launch date', () => {
    expect(LAUNCH_DATE).toBe('2026-10-22')
    expect(dailyNumber('2026-10-22')).toBe(1)
    expect(dailyNumber('2026-10-23')).toBe(2)
    expect(dailyNumber('2027-02-25')).toBe(127)
  })

  it('rolls over at Sofia midnight, not UTC midnight', () => {
    // 2026-10-25 is the switch to winter time: 21:59Z is still 2026-10-25 23:59 in Sofia.
    expect(dailyNumber(new Date('2026-10-24T20:59:59Z'))).toBe(3)
    expect(dailyNumber(new Date('2026-10-24T21:00:00Z'))).toBe(4)
    expect(dailyNumber(new Date('2026-10-25T21:59:59Z'))).toBe(4)
    expect(dailyNumber(new Date('2026-10-25T22:00:00Z'))).toBe(5)
    expect(dailyNumber(new Date('2026-10-22T00:00:00Z'))).toBe(1)
  })
})

describe('dailyIndex', () => {
  it('matches a known answer', () => {
    // This literal pins the HMAC byte order/endianness, so a refactor cannot
    // silently change every daily number.
    expect(dailyIndex('s', '2026-10-20', 4, false)).toBe(1956)
  })
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
