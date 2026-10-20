import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { AuthUser } from '../../ports/auth'
import { fail } from '../respond'
import type { AppEnv } from '../types'

const BEARER = /^Bearer\s+(\S+)$/i

async function authenticate(c: Context<AppEnv>): Promise<AuthUser | null> {
  const match = BEARER.exec(c.req.header('Authorization') ?? '')
  return match?.[1] ? c.get('deps').auth.verify(match[1]) : null
}

/** 401 `ERR_AUTH` without a valid Bearer token; otherwise sets `user`. Guests pass. */
export const requireUser = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = await authenticate(c)
    if (!user) return fail(c, 'ERR_AUTH', 401)
    c.set('user', user)
    await next()
  })

/** Like `requireUser`, plus 403 `ERR_GUEST` for guests. */
export const requireMember = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = await authenticate(c)
    if (!user) return fail(c, 'ERR_AUTH', 401)
    if (user.isGuest) return fail(c, 'ERR_GUEST', 403)
    c.set('user', user)
    await next()
  })
