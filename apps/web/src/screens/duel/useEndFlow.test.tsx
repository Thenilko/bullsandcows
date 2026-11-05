import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixtureState } from '../../dev/duelFixtures'
import { useSession } from '../../features/auth/session'
import { ME_KEY } from '../../features/stats/useMe'
import { RESULT_DELAY_MS, useEndFlow } from './useEndFlow'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('../../features/auth/client', () => ({ api }))

const ME = { profile: { username: 'Мира' }, xp: 1120, level: 6 }

describe('useEndFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    api.get.mockResolvedValue(ME)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('reloads the profile with the result, so the duel XP shows without a page reload', async () => {
    const qc = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const go = vi.fn()
    const ended = fixtureState({ phase: 'ended', outcome: { winner: 'a', reason: 'solved' } })
    renderHook(() => useEndFlow('r1', ended, go), { wrapper })

    expect(api.get).not.toHaveBeenCalledWith('/api/me')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESULT_DELAY_MS)
    })
    expect(go).toHaveBeenCalledWith('/duel/r1/result')
    expect(api.get).toHaveBeenCalledWith('/api/me')
    expect(qc.getQueryData(ME_KEY)).toEqual(ME)
    expect(useSession.getState().me).toEqual(ME)
  })
})
