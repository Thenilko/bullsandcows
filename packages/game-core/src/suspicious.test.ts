import { describe, expect, it } from 'vitest'
import { SUSPICIOUS, isSuspicious } from './suspicious'

describe('isSuspicious', () => {
  it('exposes thresholds', () => {
    expect(SUSPICIOUS).toEqual({ minAvgIntervalMs: 400, fastSolveMs: 8000, fastSolveMinLen: 4 })
  })
  it('flags a too-fast average interval', () => {
    expect(isSuspicious([1000, 1300, 1600], 0, 4, true)).toBe(true)
    expect(isSuspicious([1000, 1300, 1600], 0, 3, false)).toBe(true)
  })
  it('flags a fast solve on length >= 4', () => {
    expect(isSuspicious([0, 5000, 7000], 0, 4, true)).toBe(true)
    expect(isSuspicious([0, 5000, 7000], 0, 5, true)).toBe(true)
  })
  it('does not flag a fast solve on length 3', () => {
    expect(isSuspicious([0, 5000, 7000], 0, 3, true)).toBe(false)
  })
  it('does not flag a slow solve', () => {
    expect(isSuspicious([0, 9000, 20000], 0, 4, true)).toBe(false)
  })
  it('does not flag a fast unsolved game with normal pace', () => {
    expect(isSuspicious([0, 5000, 7000], 0, 4, false)).toBe(false)
  })
  it('handles a single guess', () => {
    expect(isSuspicious([5000], 0, 4, false)).toBe(false)
    expect(isSuspicious([5000], 0, 4, true)).toBe(true)
    expect(isSuspicious([9000], 0, 4, true)).toBe(false)
  })
  it('handles no guesses', () => {
    expect(isSuspicious([], 0, 4, false)).toBe(false)
  })
  it('measures the solve time from the start timestamp', () => {
    expect(isSuspicious([100000, 105000, 107000], 100000, 4, true)).toBe(true)
    expect(isSuspicious([100000, 109000, 120000], 100000, 4, true)).toBe(false)
  })
})
