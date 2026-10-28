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

describe('supabase auth verify (key set unavailable)', () => {
  const upstreamFailure = async (name: string, jwksReply: () => Promise<Response>) => {
    const url = `https://verify-${name}.supabase.co`
    const token = await signedToken(url, {})
    vi.spyOn(globalThis, 'fetch').mockImplementation(jwksReply)
    const err = await createSupabaseAuth(config(url))
      .verify(token)
      .catch((e: unknown) => e)
    expect(err).toMatchObject({ code: 'ERR_INTERNAL', status: 502 })
  }

  it('throws a 502 instead of reporting the token invalid when the key set cannot be fetched', () =>
    upstreamFailure('netdown', async () => Promise.reject(new TypeError('network down'))))

  it('throws a 502 when the key set endpoint answers with an error', () =>
    upstreamFailure('jwks500', async () => new Response('oops', { status: 500 })))

  it('throws a 502 when the key set is not valid JSON', () =>
    upstreamFailure('jwksjunk', async () => new Response('<html>', { status: 200 })))
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

describe('supabase auth hardening', () => {
  const url = 'https://p.supabase.co'

  it('puts a timeout signal on every call and maps a timeout to ERR_INTERNAL', async () => {
    const fetchImpl = vi.fn(async (_url: URL, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      return json(sessionBody(false))
    })
    await createSupabaseAuth(config(url), fetchImpl as never).signIn('a@b.cd', 'pw')
    expect(fetchImpl).toHaveBeenCalledOnce()
    const slow = createSupabaseAuth(config(url), async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError')
    })
    await expect(slow.signIn('a@b.cd', 'pw')).rejects.toMatchObject({
      code: 'ERR_INTERNAL',
      status: 502,
    })
  })

  it('accepts empty 2xx bodies for upgrade and reset', async () => {
    const auth = createSupabaseAuth(config(url), async () => new Response(null, { status: 204 }))
    await expect(auth.upgrade('user-1', 'g@example.com', 'pw')).resolves.toBeUndefined()
    await expect(auth.requestReset('g@example.com', 'https://a.example/reset')).resolves.toBe(
      undefined,
    )
    const blank = createSupabaseAuth(config(url), async () => new Response('', { status: 200 }))
    await expect(blank.requestReset('g@example.com', 'https://a.example/reset')).resolves.toBe(
      undefined,
    )
  })

  it('treats 401/403 from Supabase as a server misconfiguration, not a user error', async () => {
    for (const status of [401, 403]) {
      const auth = createSupabaseAuth(config(url), async () => json({ msg: 'bad key' }, status))
      await expect(auth.signIn('a@b.cd', 'pw')).rejects.toMatchObject({
        code: 'ERR_INTERNAL',
        status: 502,
      })
      await expect(auth.signUp('a@b.cd', 'pw')).rejects.toMatchObject({ code: 'ERR_INTERNAL' })
    }
    const taken = createSupabaseAuth(config(url), async () => json({ msg: 'exists' }, 422))
    await expect(taken.signUp('a@b.cd', 'pw')).rejects.toMatchObject({
      code: 'ERR_INPUT',
      status: 400,
    })
  })
})

describe('supabase auth deleteUser', () => {
  it('deletes through the admin API with the service role key', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }))
    const auth = createSupabaseAuth(config('https://p.supabase.co'), fetchImpl)
    await auth.deleteUser('user-1')
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://p.supabase.co/auth/v1/admin/users/user-1')
    expect(init.method).toBe('DELETE')
    expect(init.headers).toMatchObject({
      apikey: 'service-key',
      Authorization: 'Bearer service-key',
    })
  })

  it('treats a user that is already gone as done and an outage as a server error', async () => {
    const gone = createSupabaseAuth(config('https://p.supabase.co'), async () => json({}, 404))
    await expect(gone.deleteUser('user-1')).resolves.toBeUndefined()
    const down = createSupabaseAuth(config('https://p.supabase.co'), async () => json({}, 503))
    await expect(down.deleteUser('user-1')).rejects.toMatchObject({ code: 'ERR_INTERNAL' })
  })
})
