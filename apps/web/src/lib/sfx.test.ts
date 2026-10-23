import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSfx, SFX_IDLE_SUSPEND_MS } from './sfx'

function fakeContext() {
  const param = () => ({
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  })
  const createOscillator = vi.fn(() => ({
    type: 'sine',
    frequency: param(),
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }))
  const createGain = vi.fn(() => ({ gain: param(), connect: vi.fn() }))
  const ctx = { currentTime: 0, state: 'running', destination: {}, resume: vi.fn(), suspend: vi.fn(() => Promise.resolve()), createOscillator, createGain }
  return { ctx: ctx as unknown as AudioContext, createOscillator }
}

describe('createSfx', () => {
  it('plays win as five arpeggio notes plus a sustain', () => {
    const { ctx, createOscillator } = fakeContext()
    createSfx(() => ctx).play('win')
    expect(createOscillator).toHaveBeenCalledTimes(6)
  })

  it('creates nothing when muted', () => {
    const { ctx, createOscillator } = fakeContext()
    const sfx = createSfx(() => ctx)
    sfx.setMuted(true)
    sfx.play('tap')
    expect(sfx.isMuted()).toBe(true)
    expect(createOscillator).not.toHaveBeenCalled()
  })

  it('does not throw when no AudioContext is available', () => {
    expect(() => createSfx(() => null).play('win')).not.toThrow()
  })

  describe('audio output sleeps between sounds (an open AudioContext keeps the phone\'s audio path awake)', () => {
    afterEach(() => vi.useRealTimers())

    it('suspends the context once the last sound has ended, plus a grace period', () => {
      vi.useFakeTimers()
      const { ctx } = fakeContext()
      const sfx = createSfx(() => ctx)
      sfx.play('tap')
      vi.advanceTimersByTime(SFX_IDLE_SUSPEND_MS)
      expect(ctx.suspend).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(ctx.suspend).toHaveBeenCalledTimes(1)
    })

    it('waits for a long or delayed sound to finish before suspending', () => {
      vi.useFakeTimers()
      const { ctx } = fakeContext()
      createSfx(() => ctx).play('win', 1)
      // win: last note starts at 1 + 0.5s and lasts 0.9s → ends at 2.45s (with the 0.05s stop tail).
      vi.advanceTimersByTime(2450 + SFX_IDLE_SUSPEND_MS - 50)
      expect(ctx.suspend).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(ctx.suspend).toHaveBeenCalledTimes(1)
    })

    it('a new sound before the deadline postpones the suspend', () => {
      vi.useFakeTimers()
      const { ctx } = fakeContext()
      const sfx = createSfx(() => ctx)
      sfx.play('tap')
      vi.advanceTimersByTime(SFX_IDLE_SUSPEND_MS - 100)
      sfx.play('tap')
      vi.advanceTimersByTime(SFX_IDLE_SUSPEND_MS - 100)
      expect(ctx.suspend).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(ctx.suspend).toHaveBeenCalledTimes(1)
    })
  })
})
