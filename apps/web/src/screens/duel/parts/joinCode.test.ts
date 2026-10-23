import { describe, expect, it } from 'vitest'
import { parseInviteCode, sanitizeTyping } from './joinCode'

describe('parseInviteCode', () => {
  it('accepts a code in any case, with spaces or dashes', () => {
    expect(parseInviteCode('abc23')).toBe('ABC23')
    expect(parseInviteCode(' AB-C 23 ')).toBe('ABC23')
  })

  it('accepts Cyrillic look-alikes from a Bulgarian keyboard', () => {
    expect(parseInviteCode('вк7q2')).toBe('BK7Q2')
    expect(parseInviteCode('АВСЕН')).toBe('ABCEH')
  })

  it('takes the code out of a pasted invite link', () => {
    expect(parseInviteCode('https://pasishte.example/d/XYZ89')).toBe('XYZ89')
    expect(parseInviteCode('https://pasishte.example/d/xyz89?s=share')).toBe('XYZ89')
  })

  it('rejects short, long and out-of-alphabet codes', () => {
    expect(parseInviteCode('ABC2')).toBeNull()
    expect(parseInviteCode('ABC234')).toBeNull()
    expect(parseInviteCode('ABC01')).toBeNull()
    expect(parseInviteCode('')).toBeNull()
  })
})

describe('sanitizeTyping', () => {
  it('upper-cases, swaps Cyrillic look-alikes and caps at five', () => {
    expect(sanitizeTyping('ab c2-3x')).toBe('ABC23')
    expect(sanitizeTyping('https://x.test/d/qwe45')).toBe('QWE45')
    expect(sanitizeTyping('вк7')).toBe('BK7')
  })

  it('keeps a wrong key visible instead of dropping it', () => {
    expect(sanitizeTyping('ab0')).toBe('AB0')
  })
})
