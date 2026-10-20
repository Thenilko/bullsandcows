import { describe, expect, it } from 'vitest'
import { AuthUserDto, HealthDto, KindSchema, LenSchema, SessionDto, ZeroSchema } from './rest'

describe('rest schemas', () => {
  it('accepts only 3, 4 and 5 digits', () => {
    expect([3, 4, 5].map((n) => LenSchema.safeParse(n).success)).toEqual([true, true, true])
    expect(LenSchema.safeParse(6).success).toBe(false)
    expect(LenSchema.safeParse('4').success).toBe(false)
  })

  it('accepts a boolean zero flag', () => {
    expect(ZeroSchema.parse(true)).toBe(true)
    expect(ZeroSchema.safeParse('true').success).toBe(false)
  })

  it('accepts only solo kinds for game creation', () => {
    expect(KindSchema.parse('daily')).toBe('daily')
    expect(KindSchema.safeParse('bot').success).toBe(false)
  })

  it('validates the health payload', () => {
    expect(HealthDto.parse({ status: 'ok' })).toEqual({ status: 'ok' })
  })

  it('validates a session payload', () => {
    const session = {
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: 1,
      user: { id: 'u1', isGuest: false },
    }
    expect(SessionDto.parse(session)).toEqual(session)
    expect(AuthUserDto.safeParse({ id: 'u1' }).success).toBe(false)
  })
})
