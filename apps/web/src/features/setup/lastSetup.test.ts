import { beforeEach, describe, expect, it } from 'vitest'
import { LAST_SETUP_KEY, loadLastSetup, saveLastSetup } from './lastSetup'

describe('lastSetup', () => {
  beforeEach(() => window.localStorage.clear())

  it('is empty before any game', () => {
    expect(loadLastSetup('solo')).toEqual({})
  })

  it('remembers each screen on its own', () => {
    saveLastSetup('solo', { len: 3, zero: true, kind: 'free' })
    saveLastSetup('bot', { len: 5, zero: false, format: 'race', level: 3 })
    expect(loadLastSetup('solo')).toEqual({ len: 3, zero: true, kind: 'free' })
    expect(loadLastSetup('bot')).toEqual({ len: 5, zero: false, format: 'race', level: 3 })
    expect(loadLastSetup('duel')).toEqual({})
  })

  it('drops invalid stored values', () => {
    window.localStorage.setItem(
      LAST_SETUP_KEY,
      JSON.stringify({ solo: { len: 7, zero: 'yes', kind: 'free' } }),
    )
    expect(loadLastSetup('solo')).toEqual({ kind: 'free' })
  })

  it('survives broken JSON', () => {
    window.localStorage.setItem(LAST_SETUP_KEY, '{oops')
    expect(loadLastSetup('duel')).toEqual({})
    saveLastSetup('duel', { opponent: 'friend' })
    expect(loadLastSetup('duel')).toEqual({ opponent: 'friend' })
  })
})
