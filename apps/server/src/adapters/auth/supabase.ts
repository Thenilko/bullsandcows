import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { z } from 'zod'
import { AppError } from '../../http/errors'
import type { AuthPort, AuthUser, Session } from '../../ports/auth'

export interface SupabaseAuthConfig {
  readonly url: string
  readonly anonKey: string
  readonly serviceRoleKey: string
}

type Fetch = typeof fetch

/** Supabase asymmetric signing keys; anything else (incl. HS256 and `none`) is refused. */
const JWT_ALGORITHMS = ['ES256', 'RS256']

const SessionResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string(),
  expires_at: z.number(),
  user: z.object({ id: z.string().min(1), is_anonymous: z.boolean().optional() }),
})

/** Per-isolate cache: jose refreshes keys itself, we only avoid rebuilding the set. */
const jwksCache = new Map<string, JWTVerifyGetKey>()

function jwksFor(baseUrl: string): JWTVerifyGetKey {
  const cached = jwksCache.get(baseUrl)
  if (cached) return cached
  const jwks = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', baseUrl))
  jwksCache.set(baseUrl, jwks)
  return jwks
}

const REQUEST_TIMEOUT_MS = 8_000

/** jose codes that mean the key set could not be loaded, not that the token is bad. */
const JWKS_UNAVAILABLE = new Set(['ERR_JWKS_TIMEOUT', 'ERR_JWKS_INVALID', 'ERR_JOSE_GENERIC'])

/** True for a rejected token; false for a network or key-set failure (the token may be fine). */
const isTokenRejection = (err: unknown): boolean =>
  err instanceof errors.JOSEError && !JWKS_UNAVAILABLE.has(err.code)

const upstream = () => new AppError('ERR_INTERNAL', 502)

const toSession = (body: unknown): Session => {
  const parsed = SessionResponse.safeParse(body)
  // A sign-up without a session means "Confirm email" is on in the project; we require it off.
  if (!parsed.success) throw upstream()
  const { access_token, refresh_token, expires_at, user } = parsed.data
  const authUser: AuthUser = { id: user.id, isGuest: user.is_anonymous === true }
  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expires_at,
    user: authUser,
  }
}

/**
 * Maps a failed Supabase response to an API error; bodies are never read or logged.
 * 401/403 mean our key is wrong (a misconfiguration), never the user's fault.
 */
function failure(status: number, clientError: AppError): AppError {
  if (status === 429) return new AppError('ERR_RATE_LIMIT', 429)
  if (status === 401 || status === 403) return upstream()
  if (status >= 400 && status < 500) return clientError
  return upstream()
}

/** Some endpoints answer 2xx with no body; that is `null`, not an error. */
async function readJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw upstream()
  }
}

/**
 * Supabase Auth over plain REST. Requires asymmetric JWT signing keys (JWKS), anonymous
 * sign-ins enabled and email confirmation off in the project settings.
 */
export function createSupabaseAuth(config: SupabaseAuthConfig, fetchImpl: Fetch = fetch): AuthPort {
  const issuer = new URL('/auth/v1', config.url).toString()
  const endpoint = (path: string) => new URL(`/auth/v1/${path}`, config.url)

  async function call(
    path: string,
    init: RequestInit,
    key: string,
    clientError: AppError,
  ): Promise<unknown> {
    const res = await fetchImpl(endpoint(path), {
      ...init,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch(() => {
      // Timeout or network failure; the cause is not exposed to the client.
      throw upstream()
    })
    if (!res.ok) {
      await res.body?.cancel()
      throw failure(res.status, clientError)
    }
    return readJson(res)
  }

  const post = (path: string, body: object, clientError: AppError) =>
    call(path, { method: 'POST', body: JSON.stringify(body) }, config.anonKey, clientError)

  return {
    verify: async (token) => {
      try {
        const { payload } = await jwtVerify(token, jwksFor(config.url), {
          issuer,
          audience: 'authenticated',
          algorithms: JWT_ALGORITHMS,
          requiredClaims: ['exp', 'sub'],
        })
        return payload.sub ? { id: payload.sub, isGuest: payload.is_anonymous === true } : null
      } catch (err) {
        // A JWKS outage must not look like a bad token: clients drop their session on 401.
        if (isTokenRejection(err)) return null
        throw upstream()
      }
    },
    signUp: async (email, password) =>
      toSession(await post('signup', { email, password }, new AppError('ERR_INPUT', 400))),
    signIn: async (email, password) =>
      toSession(
        await post(
          'token?grant_type=password',
          { email, password },
          new AppError('ERR_CREDENTIALS', 401),
        ),
      ),
    signInGuest: async () => toSession(await post('signup', {}, new AppError('ERR_INTERNAL', 502))),
    upgrade: async (userId, email, password) => {
      const init = { method: 'PUT', body: JSON.stringify({ email, password, email_confirm: true }) }
      await call(
        `admin/users/${encodeURIComponent(userId)}`,
        init,
        config.serviceRoleKey,
        new AppError('ERR_INPUT', 400),
      )
    },
    requestReset: async (email, redirectTo) => {
      const path = `recover?redirect_to=${encodeURIComponent(redirectTo)}`
      await post(path, { email }, new AppError('ERR_INPUT', 400))
    },
    deleteUser: async (userId) => {
      const path = `admin/users/${encodeURIComponent(userId)}`
      const res = await fetchImpl(endpoint(path), {
        method: 'DELETE',
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }).catch(() => {
        throw upstream()
      })
      await res.body?.cancel()
      if (!res.ok && res.status !== 404) throw failure(res.status, upstream())
    },
  }
}
