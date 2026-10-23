import { describe, expect, it } from 'vitest'
import {
  FALLBACK_HISTOGRAM,
  MIN_SAMPLE,
  histogramFromAttempts,
  pickHistogram,
  topOf,
} from './distribution'

describe('topOf', () => {
  it('ranks a one-attempt win at the very top', () => {
    const r = topOf(1, FALLBACK_HISTOGRAM[4])
    expect(r.top).toBe(1)
    expect(r.beat).toBe(100)
    expect(r.idx).toBe(0)
  })
  it('places a mid result inside the distribution', () => {
    const r = topOf(6, FALLBACK_HISTOGRAM[4])
    expect(r.top).toBe(37)
    expect(r.beat).toBe(53)
    expect(r.idx).toBe(5)
    expect(r.avg).toBeCloseTo(6.83, 2)
  })
  it('clamps attempts beyond the last bucket', () => {
    expect(topOf(40, FALLBACK_HISTOGRAM[3]).idx).toBe(8)
  })
  it('does not mutate the histogram', () => {
    const copy = [...FALLBACK_HISTOGRAM[4]]
    topOf(6, FALLBACK_HISTOGRAM[4])
    expect(FALLBACK_HISTOGRAM[4]).toEqual(copy)
  })
})

describe('histogramFromAttempts', () => {
  it('buckets attempts, folding the tail into the last bucket', () => {
    expect(histogramFromAttempts([1, 2, 2, 15], 4)).toEqual([1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
  })
})

describe('pickHistogram', () => {
  it('falls back below the minimum sample', () => {
    const r = pickHistogram(Array<number>(MIN_SAMPLE - 1).fill(4), 4)
    expect(r.fallback).toBe(true)
    expect(r.sample).toBe(29)
    expect(r.histogram).toBe(FALLBACK_HISTOGRAM[4])
  })
  it('uses real data at the minimum sample', () => {
    const r = pickHistogram(Array<number>(MIN_SAMPLE).fill(4), 4)
    expect(r.fallback).toBe(false)
    expect(r.sample).toBe(30)
    expect(r.histogram[3]).toBe(30)
  })
})
