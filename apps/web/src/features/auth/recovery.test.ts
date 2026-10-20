import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ME = { profile: { username: 'pastir' }, xp: 0 }
const USER_A = { accessToken: 'a-acc', refreshToken: 'a-ref', expiresAt: 1, user: { id: 'user-a', isGuest: false } }

async function setup(
  opts: { updateError?: { code?: string; message: string; status?: number }; session?: unknown; recoveryUser?: string; stored?: boolean } = {},
) {
  vi.resetModules()
  const auth = {
    setSession: vi.fn(async () => ({})),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    updateUser: vi.fn(async () => ({ data: { user: {} }, error: opts.updateError ?? null })),
    getSession: vi.fn(async () => ({
      data: {
        session:
          opts.session === undefined
            ? { access_token: 'acc', refresh_token: 'ref', expires_at: 77, user: { id: 'u1', is_anonymous: false } }
            : opts.session,
      },
      error: null,
    })),
  }
  vi.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ auth }) }))
  const store = await import('./session')
  if (opts.stored) store.useSession.setState({ session: USER_A, me: null })
  const session = await import('./SupabaseSession')
  let listener: (e: string, s: unknown) => void = () => undefined
  auth.onAuthStateChange.mockImplementation(((cb: typeof listener) => {
    listener = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  }) as never)
  await session.startSupabaseSync()
  listener('PASSWORD_RECOVERY', { access_token: 'acc', refresh_token: 'ref', user: { id: opts.recoveryUser ?? 'u1' } })
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: ME }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  const mod = await import('./recovery')
  const { useSession } = await import('./session')
  return { mod, auth, fetchMock, useSession }
}

beforeEach(() => {
  vi.stubEnv('VITE_AUTH_MODE', 'supabase')
  vi.stubEnv('VITE_SUPABASE_URL', 'http://sb.test')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
})
afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('completeRecovery', () => {
  it('sets the new password, then signs in with the recovered session and the profile', async () => {
    const { mod, auth, fetchMock } = await setup()
    const res = await mod.completeRecovery('secret1')
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'secret1' })
    expect(res).toEqual({
      session: { accessToken: 'acc', refreshToken: 'ref', expiresAt: 77, user: { id: 'u1', isGuest: false } },
      me: ME,
    })
    const [path, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(path).toBe('/api/me')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer acc')
  })

  it('a recovery link for B on a device signed in as A changes only B and ends signed in as B', async () => {
    window.history.replaceState(null, '', '/reset#access_token=acc&refresh_token=ref&type=recovery')
    const { mod, auth, useSession } = await setup({ stored: true, recoveryUser: 'u1' })
    expect(auth.setSession).not.toHaveBeenCalled()
    expect(useSession.getState().session).toBeNull()
    await mod.completeRecovery('secret1')
    expect(auth.updateUser).toHaveBeenCalledTimes(1)
    expect(useSession.getState().session).toMatchObject({ accessToken: 'acc', user: { id: 'u1' } })
    expect(useSession.getState().recoverySession).toBe(false)
  })

  it('a PASSWORD_RECOVERY for another user drops the stored session even without the hash', async () => {
    const { useSession, auth } = await setup({ stored: true, recoveryUser: 'u1' })
    expect(auth.setSession).toHaveBeenCalled()
    expect(useSession.getState().session).toBeNull()
    expect(useSession.getState().recoverySession).toBe(true)
  })

  it('refuses to change a password on a session that is not the recovery one', async () => {
    const { mod, auth } = await setup({ recoveryUser: 'someone-else' })
    await expect(mod.completeRecovery('secret1')).rejects.toMatchObject({ key: 'reset.error.expired' })
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('maps supabase errors to reset error keys', async () => {
    const same = await setup({ updateError: { code: 'same_password', message: 'x', status: 422 } })
    await expect(same.mod.completeRecovery('secret1')).rejects.toMatchObject({ key: 'reset.error.same' })
    const weak = await setup({ updateError: { code: 'weak_password', message: 'x', status: 422 } })
    await expect(weak.mod.completeRecovery('secret1')).rejects.toMatchObject({ key: 'reset.error.weak' })
    const gone = await setup({ updateError: { message: 'Auth session missing!', status: 400 } })
    await expect(gone.mod.completeRecovery('secret1')).rejects.toMatchObject({ key: 'reset.error.expired' })
  })

  it('treats a missing session after the update as an expired link', async () => {
    const { mod } = await setup({ session: null })
    await expect(mod.completeRecovery('secret1')).rejects.toMatchObject({ key: 'reset.error.expired' })
  })

  it('is unavailable in fake mode', async () => {
    vi.stubEnv('VITE_AUTH_MODE', 'fake')
    const { mod, auth } = await setup()
    expect(auth.onAuthStateChange).not.toHaveBeenCalled()
    await expect(mod.completeRecovery('secret1')).rejects.toMatchObject({ key: 'reset.unavailable' })
    expect(auth.updateUser).not.toHaveBeenCalled()
  })
})
