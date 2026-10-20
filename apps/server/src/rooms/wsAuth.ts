import { levelFromXp, type Rating } from '@bc/game-core'
import { apiErr, type ErrorCode } from '@bc/protocol'
import { makeAuth } from '../adapters/auth'
import { makeRepo } from '../adapters/repo'
import { ensureProfile } from '../auth/profiles'
import type { PlayerInfo } from '../duel/roomClient'
import type { Env } from '../env'
import { SECURITY_HEADERS } from '../http/middleware/headers'

/**
 * Identity headers. ONLY the Worker sets them (after verifying the JWT); a Durable Object
 * must never trust these headers on a request that did not come through `forwardWithIdentity`.
 * `forwardWithIdentity` drops any client-supplied copy before setting its own.
 */
const H = {
  id: 'x-user-id',
  username: 'x-username',
  level: 'x-level',
  rating: 'x-rating',
  rd: 'x-rd',
  vol: 'x-vol',
  guest: 'x-guest',
} as const

const reject = (code: ErrorCode, status: number): Response =>
  Response.json(apiErr(code), { status, headers: SECURITY_HEADERS })

/**
 * Verifies the `?auth=` access token and loads the profile, BEFORE any WebSocket upgrade.
 * Missing/invalid token: 401 ERR_AUTH. Guest: 403 ERR_GUEST (for queue-only use).
 */
export async function authenticateWs(
  req: Request,
  env: Env,
): Promise<{ info: PlayerInfo } | Response> {
  const token = new URL(req.url).searchParams.get('auth')
  if (!token) return reject('ERR_AUTH', 401)
  const user = await makeAuth(env).verify(token)
  if (!user) return reject('ERR_AUTH', 401)
  if (user.isGuest) return reject('ERR_GUEST', 403)
  const repo = makeRepo(env)
  try {
    const profile = await ensureProfile(repo, user)
    return {
      info: {
        id: user.id,
        username: profile.username,
        level: levelFromXp(profile.xp),
        rating: profile.rating,
        isGuest: false,
      },
    }
  } finally {
    await repo.close()
  }
}

/** A copy of `req` carrying `info` in the identity headers (any client copies are removed). */
export function forwardWithIdentity(req: Request, info: PlayerInfo): Request {
  const headers = new Headers(req.headers)
  for (const name of Object.values(H)) headers.delete(name)
  headers.set(H.id, info.id)
  headers.set(H.username, encodeURIComponent(info.username))
  headers.set(H.level, String(info.level))
  headers.set(H.rating, String(info.rating.rating))
  headers.set(H.rd, String(info.rating.rd))
  headers.set(H.vol, String(info.rating.vol))
  headers.set(H.guest, info.isGuest ? '1' : '0')
  return new Request(req, { headers })
}

const num = (v: string | null): number | null => {
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Inverse of `forwardWithIdentity`; null when any header is absent or malformed. */
export function readIdentity(headers: Headers): PlayerInfo | null {
  const id = headers.get(H.id)
  const username = headers.get(H.username)
  const level = num(headers.get(H.level))
  const rating = num(headers.get(H.rating))
  const rd = num(headers.get(H.rd))
  const vol = num(headers.get(H.vol))
  if (!id || username === null || level === null || rating === null || rd === null || vol === null)
    return null
  const r: Rating = { rating, rd, vol }
  return {
    id,
    username: decodeURIComponent(username),
    level,
    rating: r,
    isGuest: headers.get(H.guest) === '1',
  }
}
