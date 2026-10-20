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
})
