import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ME = { profile: { id: 'anon-1', username: 'guest-ABCD', isGuest: true } }

async function setup(signIn: () => Promise<unknown>) {
  vi.resetModules()
  const auth = {
    signInAnonymously: vi.fn(signIn),
    setSession: vi.fn(async () => ({})),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  }
  vi.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ auth }) }))
  const { useAuth } = await import('./useAuth')
  const { useSession } = await import('./session')
  useSession.getState().clear()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/login']}>{children}</MemoryRouter>
  )
  const hook = renderHook(() => ({ auth: useAuth(), path: useLocation().pathname }), { wrapper })
  return { hook, auth, useSession }
}

const anonSession = {
  data: {
    session: {
      access_token: 'anon-at',
      refresh_token: 'anon-rt',
      expires_at: 4000,
      user: { id: 'anon-1', is_anonymous: true },
    },
  },
  error: null,
}

beforeEach(() => {
  vi.stubEnv('VITE_AUTH_MODE', 'supabase')
  vi.stubEnv('VITE_SUPABASE_URL', 'http://sb.test')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('useAuth guest (supabase mode)', () => {
  it('signs in anonymously on the client, then only asks the server for the profile', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { session: null, me: ME } })))
    vi.stubGlobal('fetch', f)
    const { hook, auth, useSession } = await setup(async () => anonSession)
    await act(() => hook.result.current.auth.guest())
    expect(auth.signInAnonymously).toHaveBeenCalledOnce()
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/auth/guest')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer anon-at')
    expect(useSession.getState().session).toEqual({
      accessToken: 'anon-at',
      refreshToken: 'anon-rt',
      expiresAt: 4000,
      user: { id: 'anon-1', isGuest: true },
    })
    expect(useSession.getState().me).toEqual(ME)
    await waitFor(() => expect(hook.result.current.path).toBe('/'))
  })

  it('maps a Supabase rate limit to ERR_RATE_LIMIT without calling the server', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    const { hook, useSession } = await setup(async () => ({
      data: { session: null },
      error: { name: 'AuthApiError', status: 429 },
    }))
    await act(() => hook.result.current.auth.guest())
    expect(hook.result.current.auth.error).toBe('ERR_RATE_LIMIT')
    expect(f).not.toHaveBeenCalled()
    expect(useSession.getState().session).toBeNull()
  })

  it('reports an unreachable Supabase as offline', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const { hook } = await setup(async () => Promise.reject(new TypeError('offline')))
    await act(() => hook.result.current.auth.guest())
    expect(hook.result.current.auth.error).toBe('ERR_INTERNAL')
    expect(hook.result.current.auth.offline).toBe(true)
  })
})
