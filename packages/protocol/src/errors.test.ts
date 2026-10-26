import { resources } from '@bc/i18n'
import { describe, expect, it } from 'vitest'
import { ERROR_CODES, apiErr, apiOk, isErrorCode } from './errors'

describe('error codes', () => {
  it('keeps the agreed server codes in order, plus ERR_INTERNAL', () => {
    expect(ERROR_CODES).toEqual([
      'ERR_AUTH',
      'ERR_GUEST',
      'ERR_INPUT',
      'ERR_CODE',
      'ERR_NOT_FOUND',
      'ERR_NOT_STARTED',
      'ERR_FINISHED',
      'ERR_REPEAT',
      'ERR_NOT_YOUR_TURN',
      'ERR_USERNAME_TAKEN',
      'ERR_CREDENTIALS',
      'ERR_INVITE_EXPIRED',
      'ERR_ROOM_FULL',
      'ERR_RATE_LIMIT',
      'ERR_FARM_FULL',
      'ERR_FARM_CODE',
      'ERR_ALREADY_IN_FARM',
      'ERR_FORBIDDEN',
      'ERR_INTERNAL',
    ])
  })

  it('has a translation for every code in both languages', () => {
    for (const lang of ['bg', 'en'] as const) {
      const errors: Record<string, string> = resources[lang].translation.error
      for (const code of ERROR_CODES) expect(errors[code], `${lang}.${code}`).toBeTruthy()
    }
  })

  it('recognises codes', () => {
    expect(isErrorCode('ERR_GUEST')).toBe(true)
    expect(isErrorCode('ERR_NOPE')).toBe(false)
  })
})

describe('api envelope helpers', () => {
  it('wraps data', () => {
    expect(apiOk({ status: 'ok' })).toEqual({ ok: true, data: { status: 'ok' } })
  })

  it('wraps an error code', () => {
    expect(apiErr('ERR_AUTH')).toEqual({ ok: false, error: { code: 'ERR_AUTH' } })
  })
})
