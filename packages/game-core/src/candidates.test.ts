import { describe, expect, it } from 'vitest'
import { filterCandidates, isConsistent } from './candidates'
import { codes } from './codes'

describe('filterCandidates', () => {
  it('keeps 120 codes sharing no digit with the guess', () => {
    const out = filterCandidates(codes(4, false), '1234', { bulls: 0, cows: 0 })
    expect(out).toHaveLength(120)
    expect(out).not.toContain('1234')
  })
  it('keeps only the guess on a full-bull verdict', () => {
    expect(filterCandidates(codes(4, false), '1234', { bulls: 4, cows: 0 })).toEqual(['1234'])
  })
  it('does not mutate its input', () => {
    const input = ['1234', '5678']
    filterCandidates(input, '1234', { bulls: 4, cows: 0 })
    expect(input).toEqual(['1234', '5678'])
  })
})

describe('isConsistent', () => {
  it('is true only when the guess is a candidate', () => {
    expect(isConsistent(['1234', '5678'], '5678')).toBe(true)
    expect(isConsistent(['1234', '5678'], '1235')).toBe(false)
  })
})
