import { describe, expect, it } from 'vitest'
import { codes, isValidCode, totalCodes } from './codes'

describe('totalCodes', () => {
  it('counts codes without zero', () => {
    expect([3, 4, 5].map((n) => totalCodes(n as 3 | 4 | 5, false))).toEqual([504, 3024, 15120])
  })
  it('counts codes with zero', () => {
    expect([3, 4, 5].map((n) => totalCodes(n as 3 | 4 | 5, true))).toEqual([720, 5040, 30240])
  })
})

describe('codes', () => {
  it('lists 3-digit codes without zero lexicographically', () => {
    const list = codes(3, false)
    expect(list).toHaveLength(504)
    expect(list[0]).toBe('123')
    expect(list[list.length - 1]).toBe('987')
    expect(list.some((c) => c.includes('0'))).toBe(false)
  })
  it('includes leading zero when zero is allowed', () => {
    expect(codes(4, true)).toHaveLength(5040)
    expect(codes(4, true)).toContain('0123')
    expect(codes(5, true)).toHaveLength(30240)
  })
  it('caches and freezes the result', () => {
    expect(codes(4, false)).toBe(codes(4, false))
    expect(Object.isFrozen(codes(4, false))).toBe(true)
  })
})

describe('isValidCode', () => {
  it.each([
    ['1123', 4, false, false],
    ['0123', 4, false, false],
    ['0123', 4, true, true],
    ['12a', 3, true, false],
    ['123', 4, true, false],
  ] as const)('isValidCode(%s, %i, %s) is %s', (s, len, zero, expected) => {
    expect(isValidCode(s, len, zero)).toBe(expected)
  })
})
