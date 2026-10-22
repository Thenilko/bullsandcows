import { describe, expect, it, vi } from 'vitest'
import { logShareLanding } from './landing'

describe('logShareLanding', () => {
  it('posts once for ?s=share and swallows a failure', async () => {
    const post = vi.fn(async () => {
      throw new Error('offline')
    })
    expect(logShareLanding('?s=share&x=1', post)).toBe(true)
    expect(post).toHaveBeenCalledTimes(1)
    await Promise.resolve()
  })

  it('ignores other query strings', () => {
    const post = vi.fn(async () => ({ logged: true as const }))
    expect(logShareLanding('', post)).toBe(false)
    expect(logShareLanding('?s=other', post)).toBe(false)
    expect(logShareLanding('?share=1', post)).toBe(false)
    expect(post).not.toHaveBeenCalled()
  })
})
