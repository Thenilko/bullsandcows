import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AMBIENT_IDLE_MS, startAmbientPause } from './ambientPause'

describe('startAmbientPause', () => {
  let stop: () => void = () => {}
  const root = () => document.documentElement

  beforeEach(() => {
    vi.useFakeTimers()
    delete root().dataset.ambient
  })
  afterEach(() => {
    stop()
    vi.useRealTimers()
  })

  it('lets the scene move at first and pauses it after the idle time without input', () => {
    stop = startAmbientPause()
    expect(root().dataset.ambient).toBeUndefined()
    vi.advanceTimersByTime(AMBIENT_IDLE_MS - 1)
    expect(root().dataset.ambient).toBeUndefined()
    vi.advanceTimersByTime(1)
    expect(root().dataset.ambient).toBe('paused')
  })

  it('resumes on a touch, a click or a key and pauses again after another idle stretch', () => {
    stop = startAmbientPause()
    vi.advanceTimersByTime(AMBIENT_IDLE_MS)
    for (const type of ['pointerdown', 'keydown', 'touchstart']) {
      window.dispatchEvent(new Event(type))
      expect(root().dataset.ambient).toBeUndefined()
      vi.advanceTimersByTime(AMBIENT_IDLE_MS)
      expect(root().dataset.ambient).toBe('paused')
    }
  })

  it('restarts the idle countdown on each input', () => {
    stop = startAmbientPause()
    vi.advanceTimersByTime(AMBIENT_IDLE_MS - 1000)
    window.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(AMBIENT_IDLE_MS - 1000)
    expect(root().dataset.ambient).toBeUndefined()
  })

  it('cleans up: no listeners, no timer, the scene moving', () => {
    stop = startAmbientPause()
    vi.advanceTimersByTime(AMBIENT_IDLE_MS)
    stop()
    expect(root().dataset.ambient).toBeUndefined()
    vi.advanceTimersByTime(AMBIENT_IDLE_MS * 2)
    expect(root().dataset.ambient).toBeUndefined()
  })
})
