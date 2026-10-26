import { describe, expect, it } from 'vitest'
import { INVITE_ALPHABET, inviteCode, isInviteCode } from './invite'

describe('inviteCode', () => {
  it('maps rng extremes to the alphabet ends', () => {
    expect(inviteCode(() => 0)).toBe('AAAAA')
    expect(inviteCode(() => 0.999)).toBe('99999')
  })
  it('generates 5 alphabet characters by default', () => {
    const c = inviteCode()
    expect(c).toHaveLength(5)
    expect(isInviteCode(c)).toBe(true)
  })
  it('has 32 symbols without ambiguous ones', () => {
    expect(INVITE_ALPHABET).toHaveLength(32)
    expect(INVITE_ALPHABET).not.toMatch(/[IO01]/)
  })
})

describe('isInviteCode', () => {
  it('accepts valid and rejects invalid codes', () => {
    expect(isInviteCode('BK7Q2')).toBe(true)
    expect(isInviteCode('bk7q2')).toBe(false)
    expect(isInviteCode('BK7Q')).toBe(false)
    expect(isInviteCode('BK7O2')).toBe(false)
  })
})
