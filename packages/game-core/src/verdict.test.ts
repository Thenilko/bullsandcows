import { describe, expect, it } from 'vitest'
import { bullsCows } from './verdict'

describe('bullsCows', () => {
  it.each([
    ['1234', '1243', 2, 2],
    ['1234', '5678', 0, 0],
    ['0123', '3210', 0, 4],
    ['1234', '1234', 4, 0],
  ])('secret %s guess %s', (secret, guess, bulls, cows) => {
    expect(bullsCows(secret, guess)).toEqual({ bulls, cows })
  })
})
