import type { SessionDto } from '@bc/protocol'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Listener = (
  event: string,
  session: { access_token: string; refresh_token: string; expires_at?: number } | null,
) => void

const SESSION: SessionDto = {
  accessToken: 'a',
  refreshToken: 'r',
  expiresAt: 1,
  user: { id: 'u', isGuest: false },
}

async function setup() {
  vi.resetModules()
  let listener: Listener = () => undefined
  const auth = {
    setSession: vi.fn(async () => ({})),
    refreshSession: vi.fn(async (): Promise<unknown> => ({
      data: { session: { access_token: 'a2', refresh_token: 'r2', expires_at: 5000, user: { id: 'u' } } },
      error: null,
    })),
    signOut: vi.fn(async () => ({})),
    onAuthStateChange: vi.fn((cb: Listener) => {
      listener = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
  }
  vi.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ auth }) }))
  const mod = await import('./SupabaseSession')
  const { useSession } = await import('./session')
  return { mod, useSession, auth, emit: (e: string, s: Parameters<Listener>[1]) => listener(e, s) }
}

beforeEach(() => {
  vi.stubEnv('VITE_AUTH_MODE', 'supabase')
  vi.stubEnv('VITE_SUPABASE_URL', 'http://sb.test')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
})
afterEach(() => vi.unstubAllEnvs())

describe('SupabaseSession', () => {
  it('updates store tokens on TOKEN_REFRESHED, SIGNED_IN and USER_UPDATED', async () => {
    const { mod, useSession, emit } = await setup()
    useSession.setState({ session: SESSION })
    await mod.startSupabaseSync()
    for (const [i, event] of ['TOKEN_REFRESHED', 'SIGNED_IN', 'USER_UPDATED'].entries()) {
      emit(event, { access_token: `a${i}`, refresh_token: `r${i}`, expires_at: 100 + i })
      expect(useSession.getState().session).toMatchObject({
        accessToken: `a${i}`,
        refreshToken: `r${i}`,
        expiresAt: 100 + i,
      })
    }
    expect(useSession.getState().session?.user.id).toBe('u')
  })

  it('raises the recovery flag on PASSWORD_RECOVERY', async () => {
    const { mod, useSession, emit } = await setup()
    await mod.startSupabaseSync()
    expect(useSession.getState().recoverySession).toBe(false)
    emit('PASSWORD_RECOVERY', { access_token: 'x', refresh_token: 'y', expires_at: 5 })
    expect(useSession.getState().recoverySession).toBe(true)
  })

  it('does not hand another user\'s tokens to the stored session', async () => {
    const { mod, useSession, emit } = await setup()
    useSession.setState({ session: SESSION })
    await mod.startSupabaseSync()
    emit('SIGNED_IN', { access_token: 'other', refresh_token: 'o', expires_at: 9, user: { id: 'someone-else' } } as never)
    expect(useSession.getState().session?.accessToken).toBe('a')
  })

  it('clears the store on SIGNED_OUT', async () => {
    const { mod, useSession, emit } = await setup()
    useSession.setState({ session: SESSION })
    await mod.startSupabaseSync()
    emit('SIGNED_OUT', null)
    expect(useSession.getState().session).toBeNull()
  })

  it('hands tokens to supabase and signs out locally only', async () => {
    const { mod, auth } = await setup()
    await mod.adoptSession(SESSION)
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' })
    await mod.signOutSupabase()
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('does nothing in fake mode', async () => {
    vi.stubEnv('VITE_AUTH_MODE', 'fake')
    const { mod, auth } = await setup()
    await mod.startSupabaseSync()
    expect(auth.onAuthStateChange).not.toHaveBeenCalled()
  })

  describe('token renewal', () => {
    const NOW_S = 1_000_000

    it('refreshes a token that expires within 60 s and stores the new tokens', async () => {
      const { mod, useSession, auth } = await setup()
      useSession.setState({ session: { ...SESSION, expiresAt: NOW_S + 30 } })
      await mod.ensureFreshToken(NOW_S * 1000)
      expect(auth.refreshSession).toHaveBeenCalledWith({ refresh_token: 'r' })
      expect(useSession.getState().session).toMatchObject({ accessToken: 'a2', refreshToken: 'r2', expiresAt: 5000 })
    })

    it('leaves a token with more than 60 s left alone', async () => {
      const { mod, useSession, auth } = await setup()
      useSession.setState({ session: { ...SESSION, expiresAt: NOW_S + 600 } })
      await mod.ensureFreshToken(NOW_S * 1000)
      expect(auth.refreshSession).not.toHaveBeenCalled()
    })

    it('shares one refresh between concurrent callers', async () => {
      const { mod, useSession, auth } = await setup()
      useSession.setState({ session: SESSION })
      const results = await Promise.all([mod.refreshTokens(), mod.refreshTokens()])
      expect(results).toEqual(['refreshed', 'refreshed'])
      expect(auth.refreshSession).toHaveBeenCalledOnce()
    })

    it('reports a rejected refresh token as invalid and a network failure as unavailable', async () => {
      const { mod, useSession, auth } = await setup()
      useSession.setState({ session: SESSION })
      auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: { name: 'AuthApiError', status: 400 },
      })
      expect(await mod.refreshTokens()).toBe('invalid')
      auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: { name: 'AuthRetryableFetchError', status: 0 },
      })
      expect(await mod.refreshTokens()).toBe('unavailable')
      expect(useSession.getState().session?.accessToken).toBe('a')
    })

    it('does not graft another user\'s refreshed tokens onto the session', async () => {
      const { mod, useSession, auth } = await setup()
      useSession.setState({ session: SESSION })
      auth.refreshSession.mockResolvedValueOnce({
        data: { session: { access_token: 'x', refresh_token: 'y', expires_at: 1, user: { id: 'other' } } },
        error: null,
      })
      expect(await mod.refreshTokens()).toBe('invalid')
      expect(useSession.getState().session?.accessToken).toBe('a')
    })

    it('never refreshes in fake mode, where a 401 means invalid', async () => {
      vi.stubEnv('VITE_AUTH_MODE', 'fake')
      const { mod, useSession, auth } = await setup()
      useSession.setState({ session: { ...SESSION, expiresAt: 0 } })
      await mod.ensureFreshToken()
      expect(await mod.refreshTokens()).toBe('invalid')
      expect(auth.refreshSession).not.toHaveBeenCalled()
    })
  })
})
