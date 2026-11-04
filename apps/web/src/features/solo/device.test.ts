import { beforeEach, describe, expect, it } from 'vitest'
import { DEVICE_KEY, deviceId } from './device'

describe('deviceId', () => {
  beforeEach(() => window.localStorage.clear())

  it('is created once and then kept, also across sign-outs', () => {
    const first = deviceId()
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
    expect(deviceId()).toBe(first)
    expect(window.localStorage.getItem(DEVICE_KEY)).toBe(first)
  })
})
