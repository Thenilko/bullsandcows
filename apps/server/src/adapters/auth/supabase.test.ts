import { SignJWT, exportJWK, generateKeyPair } from 'jose'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseAuth } from './supabase'

const config = (url: string) => ({ url, anonKey: 'anon-key', serviceRoleKey: 'service-key' })

const sessionBody = (isAnonymous: boolean) => ({
  access_token: 'at',
  refresh_token: 'rt',
  expires_at: 1_700_003_600,
  user: { id: 'user-1', is_anonymous: isAnonymous },
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => {
  vi.restoreAllMocks()
})

interface TokenOptions {
  readonly audience?: string
  readonly subject?: string | null
  /** `null` omits the `exp` claim. */
  readonly expiresAt?: string | number | null
}

async function signedToken(
  url: string,
  claims: Record<string, unknown>,
  options: TokenOptions = {},
) {
  const { audience = 'authenticated', subject = 'user-1', expiresAt = '1h' } = options
  const { publicKey, privateKey } = await generateKeyPair('ES256')
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' }
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ keys: [jwk] }))
  const jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
    .setIssuer(`${url}/auth/v1`)
    .setAudience(audience)
  if (subject !== null) jwt.setSubject(subject)
  if (expiresAt !== null) jwt.setExpirationTime(expiresAt)
  return jwt.sign(privateKey)
}

describe('supabase auth verify', () => {
  it('accepts a token signed by the project keys', async () => {
    const url = 'https://verify-ok.supabase.co'
    const token = await signedToken(url, { is_anonymous: true })
    expect(await createSupabaseAuth(config(url)).verify(token)).toEqual({
      id: 'user-1',
      isGuest: true,
    })
  })

  it('rejects a token for another audience or garbage', async () => {
    const url = 'https://verify-bad.supabase.co'
    const token = await signedToken(url, {}, { audience: 'anon' })
    const auth = createSupabaseAuth(config(url))
    expect(await auth.verify(token)).toBeNull()
    expect(await auth.verify('not-a-jwt')).toBeNull()
  })
})

describe('supabase auth verify (required claims)', () => {
  const rejects = async (name: string, options: TokenOptions) => {
    const url = `https://verify-${name}.supabase.co`
    const token = await signedToken(url, {}, options)
    expect(await createSupabaseAuth(config(url)).verify(token)).toBeNull()
  }

  it('rejects an expired token', () =>
    rejects('expired', { expiresAt: Math.floor(Date.now() / 1000) - 60 }))

  it('rejects a token without a subject', () => rejects('nosub', { subject: null }))

  it('rejects a token without an expiry', () => rejects('noexp', { expiresAt: null }))
})

describe('supabase auth calls', () => {
  it('signs in with the anon key and maps the session', async () => {
    const fetchImpl = vi.fn(async () => json(sessionBody(false)))
    const auth = createSupabaseAuth(config('https://p.supabase.co'), fetchImpl)
    const session = await auth.signIn('mira@example.com', 'pw')
    expect(session).toEqual({
      accessToken: 'at',
      refreshToken: 'rt',
      expiresAt: 1_700_003_600,
      user: { id: 'user-1', isGuest: false },
    })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://p.supabase.co/auth/v1/token?grant_type=password')
    expect(init.headers).toMatchObject({ apikey: 'anon-key', Authorization: 'Bearer anon-key' })
  })

  it('maps a rejected login to ERR_CREDENTIALS and throttling to ERR_RATE_LIMIT', async () => {
    const auth = createSupabaseAuth(config('https://p.supabase.co'), async () =>
      json({ msg: 'no' }, 400),
    )
    await expect(auth.signIn('a@b.c', 'x')).rejects.toMatchObject({
      code: 'ERR_CREDENTIALS',
      status: 401,
    })
    const slow = createSupabaseAuth(config('https://p.supabase.co'), async () => json({}, 429))
    await expect(slow.signIn('a@b.c', 'x')).rejects.toMatchObject({
      code: 'ERR_RATE_LIMIT',
      status: 429,
    })
    const down = createSupabaseAuth(config('https://p.supabase.co'), async () => json({}, 503))
    await expect(down.signUp('a@b.c', 'x')).rejects.toMatchObject({ code: 'ERR_INTERNAL' })
  })

  it('creates anonymous guests and treats a session-less sign-up as a server error', async () => {
    const guest = createSupabaseAuth(config('https://p.supabase.co'), async () =>
      json(sessionBody(true)),
    )
    expect((await guest.signInGuest()).user.isGuest).toBe(true)
    const noSession = createSupabaseAuth(config('https://p.supabase.co'), async () =>
      json({ id: 'u' }),
    )
    await expect(noSession.signUp('a@b.c', 'pw')).rejects.toMatchObject({
      code: 'ERR_INTERNAL',
      status: 502,
    })
  })

  it('upgrades with the service role key and requests a reset with a redirect', async () => {
    const fetchImpl = vi.fn(async () => json({}))
    const auth = createSupabaseAuth(config('https://p.supabase.co'), fetchImpl)
    await auth.upgrade('user-1', 'g@example.com', 'pw')
    await auth.requestReset('g@example.com', 'https://app.example/reset')
    const calls = fetchImpl.mock.calls as unknown as [URL, RequestInit][]
    expect(calls[0]?.[0].toString()).toBe('https://p.supabase.co/auth/v1/admin/users/user-1')
    expect(calls[0]?.[1]).toMatchObject({ method: 'PUT', headers: { apikey: 'service-key' } })
    expect(calls[1]?.[0].toString()).toBe(
      'https://p.supabase.co/auth/v1/recover?redirect_to=https%3A%2F%2Fapp.example%2Freset',
    )
  })
})
