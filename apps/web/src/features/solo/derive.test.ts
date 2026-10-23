import { describe, expect, it } from 'vitest'
import { deriveGuesses, mismatches } from './derive'

describe('deriveGuesses', () => {
  it('matches the replayed candidate counts and flags a wasted guess', () => {
    const derived = deriveGuesses(3, false, [
      { guess: '123', bulls: 0, cows: 0, consistent: true, left: 0 },
      { guess: '123', bulls: 3, cows: 0, consistent: true, left: 0 },
    ])
    expect(derived[0]?.consistent).toBe(true)
    expect(derived[0]?.left).toBe(120)
    expect(derived[1]).toEqual({ consistent: false, left: 0 })
  })

  it('reports an index when the server value differs', () => {
    expect(mismatches(3, false, [{ guess: '123', bulls: 3, cows: 0, consistent: true, left: 7 }])).toEqual([0])
    expect(mismatches(3, false, [{ guess: '123', bulls: 3, cows: 0, consistent: true, left: 1 }])).toEqual([])
  })
})
