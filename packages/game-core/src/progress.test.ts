import { describe, expect, it } from 'vitest'
import { IDLE_PROGRESS, progress, wideSunY } from './progress'

describe('progress', () => {
  it('starts foggy at full candidate count', () => {
    const p = progress(3024, 3024)
    expect(p.prog).toBeCloseTo(0, 9)
    expect(p.fog).toBeCloseTo(0.9, 9)
    expect(p.sunY).toBeCloseTo(176, 9)
    expect(p.dawn).toBeCloseTo(0.75, 9)
  })
  it('ends clear at one candidate', () => {
    const p = progress(1, 3024)
    expect(p.prog).toBeCloseTo(1, 9)
    expect(p.fog).toBeCloseTo(0, 9)
    expect(p.sunY).toBeCloseTo(26, 9)
    expect(p.dawn).toBeCloseTo(0, 9)
  })
  it.each([
    [0, 3024],
    [1, 1],
    [5, 1],
  ])('clamps degenerate input (%i, %i) to prog 1', (left, total) => {
    const p = progress(left, total)
    expect(p.prog).toBe(1)
    expect(Number.isFinite(p.sunY)).toBe(true)
  })
  it('places the wide-scene sun at 380 - 260 * prog', () => {
    expect(wideSunY(0)).toBe(380)
    expect(wideSunY(1)).toBe(120)
    expect(wideSunY(IDLE_PROGRESS.prog)).toBeCloseTo(172, 9)
    expect(wideSunY(progress(1, 3024).prog)).toBe(120)
  })
  it('exposes an idle scene at prog 0.8', () => {
    expect(IDLE_PROGRESS.prog).toBe(0.8)
    expect(IDLE_PROGRESS.fog).toBeCloseTo(0.18, 9)
    expect(IDLE_PROGRESS.sunY).toBeCloseTo(56, 9)
    expect(IDLE_PROGRESS.dawn).toBeCloseTo(0.15, 9)
  })
})
