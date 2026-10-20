import { describe, expect, it } from 'vitest'
import { sofiaWeekStart } from './time'

const at = (iso: string) => sofiaWeekStart(Date.parse(iso))

describe('sofiaWeekStart', () => {
  it('returns Monday 00:00 Europe/Sofia of the current ISO week', () => {
    // Tuesday in summer time (UTC+3).
    expect(at('2026-10-20T09:00:00Z')).toBe(Date.parse('2026-10-18T21:00:00Z'))
    // Sunday 23:30 local, the night summer time ended: still the same week.
    expect(at('2026-10-25T21:30:00Z')).toBe(Date.parse('2026-10-18T21:00:00Z'))
  })

  it('starts a new week at local midnight, in winter time after the switch', () => {
    expect(at('2026-10-25T22:00:00Z')).toBe(Date.parse('2026-10-25T22:00:00Z'))
    expect(at('2026-10-25T22:30:00Z')).toBe(Date.parse('2026-10-25T22:00:00Z'))
    expect(at('2026-10-28T12:00:00Z')).toBe(Date.parse('2026-10-25T22:00:00Z'))
  })

  it('handles the start of summer time', () => {
    // 2026-03-29 is the switch Sunday; Monday 2026-03-30 00:00 local is UTC+3.
    expect(at('2026-03-31T08:00:00Z')).toBe(Date.parse('2026-03-29T21:00:00Z'))
    expect(at('2026-03-29T08:00:00Z')).toBe(Date.parse('2026-03-22T22:00:00Z'))
  })
})
