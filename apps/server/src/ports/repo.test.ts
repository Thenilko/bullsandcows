import { describe, expect, it } from 'vitest'
import { withoutSecret, type GameRow } from './repo'

describe('withoutSecret', () => {
  it('drops the secret and keeps the rest', () => {
    const game = { id: 'g1', secret: '1234', attempts: 3 } as unknown as GameRow
    expect(withoutSecret(game)).toEqual({ id: 'g1', attempts: 3 })
    expect(game.secret).toBe('1234')
  })
})
