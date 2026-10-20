import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ME = { profile: { username: 'pastir' }, xp: 0 }

async function setup(opts: { updateError?: { code?: string; message: string; status?: number }; session?: unknown } = {}) {
  vi.resetModules()
  const auth = {
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
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: ME }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  const mod = await import('./recovery')
  return { mod, auth, fetchMock }
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
    await expect(mod.completeRecovery('secret1')).rejects.toMatchObject({ key: 'reset.unavailable' })
    expect(auth.updateUser).not.toHaveBeenCalled()
  })
})
