import { describe, expect, it } from 'vitest'
import {
  AuthUserDto,
  DistributionQuery,
  HealthDto,
  KindSchema,
  LeaderboardQuery,
  LenSchema,
  RegisterBody,
  SessionDto,
  SettingsPatch,
  UsernameSchema,
  ZeroSchema,
} from './rest'

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

describe('profile and auth schemas', () => {
  it('normalises usernames and enforces 2–20 letters, digits, _ - and space', () => {
    expect(UsernameSchema.parse('  Баба   Яга ')).toBe('Баба Яга')
    expect(UsernameSchema.parse('mira_99-x')).toBe('mira_99-x')
    for (const bad of ['a', ' b ', 'x'.repeat(21), 'mira!', 'a@b', 'a:b']) {
      expect(UsernameSchema.safeParse(bad).success, bad).toBe(false)
    }
  })

  it('lowercases emails and requires 6+ character passwords', () => {
    const body = { username: 'Mira', email: 'Mira@Example.COM', password: '123456' }
    expect(RegisterBody.parse(body).email).toBe('mira@example.com')
    expect(RegisterBody.safeParse({ ...body, password: '12345' }).success).toBe(false)
    expect(RegisterBody.safeParse({ ...body, email: 'nope' }).success).toBe(false)
  })

  it('accepts only the four settings', () => {
    expect(SettingsPatch.parse({ lang: 'en', defaultLen: 5 })).toEqual({
      lang: 'en',
      defaultLen: 5,
    })
    expect(SettingsPatch.safeParse({ xp: 10 }).success).toBe(false)
    expect(SettingsPatch.safeParse({ lang: 'de' }).success).toBe(false)
  })

  it('parses query strings', () => {
    expect(DistributionQuery.parse({ len: '4', zero: 'true', kind: 'daily' })).toEqual({
      len: 4,
      zero: true,
      kind: 'daily',
    })
    expect(LeaderboardQuery.safeParse({ period: 'year', len: '4', zero: 'false' }).success).toBe(
      false,
    )
    expect(DistributionQuery.safeParse({ len: '6', zero: 'false', kind: 'free' }).success).toBe(
      false,
    )
  })
})
