import { describe, expect, it, vi } from 'vitest'
import { createSfx } from './sfx'

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
  const ctx = { currentTime: 0, state: 'running', destination: {}, resume: vi.fn(), createOscillator, createGain }
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
})
