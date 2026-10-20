import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { z } from 'zod'
import { AppError } from '../../http/errors'
import type { AuthPort, AuthUser, Session } from '../../ports/auth'

export interface SupabaseAuthConfig {
  readonly url: string
  readonly anonKey: string
  readonly serviceRoleKey: string
}

type Fetch = typeof fetch

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

const toSession = (body: unknown): Session => {
  const parsed = SessionResponse.safeParse(body)
  // A sign-up without a session means "Confirm email" is on in the project; we require it off.
  if (!parsed.success) throw new AppError('ERR_INTERNAL', 502)
  const { access_token, refresh_token, expires_at, user } = parsed.data
  const authUser: AuthUser = { id: user.id, isGuest: user.is_anonymous === true }
  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expires_at,
    user: authUser,
  }
}

/** Maps a failed Supabase response to an API error; bodies are never read or logged. */
function failure(status: number, clientError: AppError): AppError {
  if (status === 429) return new AppError('ERR_RATE_LIMIT', 429)
  if (status >= 400 && status < 500) return clientError
  return new AppError('ERR_INTERNAL', 502)
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
    })
    if (!res.ok) {
      await res.body?.cancel()
      throw failure(res.status, clientError)
    }
    return res.json()
  }

  const post = (path: string, body: object, clientError: AppError) =>
    call(path, { method: 'POST', body: JSON.stringify(body) }, config.anonKey, clientError)

  return {
    verify: async (token) => {
      try {
        const { payload } = await jwtVerify(token, jwksFor(config.url), {
          issuer,
          audience: 'authenticated',
        })
        return payload.sub ? { id: payload.sub, isGuest: payload.is_anonymous === true } : null
      } catch {
        return null
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
  }
}
