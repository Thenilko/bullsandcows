import { describe, expect, it } from 'vitest'
import { myGuess } from '../../dev/duelFixtures'
import { toNotebookGuesses } from './notebookGuesses'

describe('toNotebookGuesses', () => {
  it('adds the running candidate count after each answer', () => {
    const rows = toNotebookGuesses([myGuess('1234', 0, 0), myGuess('5678', 2, 2)], 4, false)
    // 4 digits of 1–9: 3024 codes; none of 1,2,3,4 leaves 5·4·3·2 = 120; two bulls and two cows of 5678 leave its 6 arrangements with exactly two digits in place.
    expect(rows.map((r) => r.left)).toEqual([120, 6])
    expect(rows[0]).toEqual({ guess: '1234', bulls: 0, cows: 0, consistent: true, left: 120 })
  })

  it('keeps the wasted-move flag', () => {
    const rows = toNotebookGuesses([myGuess('1234', 4, 0), myGuess('5678', 0, 0, false)], 4, false)
    expect(rows[1]?.consistent).toBe(false)
    expect(rows[0]?.left).toBe(1)
  })
})
