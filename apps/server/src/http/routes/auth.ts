import { LoginBody, RegisterBody, ResetBody, UpgradeBody } from '@bc/protocol'
import { Hono, type Context } from 'hono'
import { requireUser } from '../middleware/auth'
import { clientIp, rateLimit } from '../middleware/rateLimit'
import { ok } from '../respond'
import { authService } from '../services'
import type { AppEnv } from '../types'
import { validate } from '../validate'

/** Guests are cheap and anonymous: a family or a school behind one IP may start many. */
const GUEST_LIMIT = { max: 60, windowMs: 60_000, name: 'auth-guest' } as const
/** Calls that name an account: per IP and account, so one account cannot be hammered. */
const ACCOUNT_LIMIT = { max: 10, windowMs: 60_000, name: 'auth' } as const
/** Same calls, all accounts together: one IP cannot spray many account names. */
const ACCOUNT_IP_LIMIT = { max: 30, windowMs: 60_000, name: 'auth-ip' } as const

/** IP plus the account named by the (already validated) body field, case-insensitive. */
const accountKey =
  (field: 'identifier' | 'email') =>
  (c: Context<AppEnv>): string => {
    const body = (c.req as unknown as { valid(target: 'json'): Record<string, unknown> }).valid('json')
    const value = body[field]
    return `${clientIp(c)}|${typeof value === 'string' ? value.trim().toLowerCase() : ''}`
  }

const limitAccount = (field: 'identifier' | 'email') =>
  [rateLimit({ ...ACCOUNT_IP_LIMIT, key: clientIp }), rateLimit({ ...ACCOUNT_LIMIT, key: accountKey(field) })] as const

/** Sign-up, sign-in, guest, guest upgrade and password reset, each rate limited. */
export function authRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()

  routes.post('/register', validate('json', RegisterBody), ...limitAccount('email'), async (c) =>
    ok(c, await authService(c).register(c.req.valid('json')), 201),
  )
  routes.post('/login', validate('json', LoginBody), ...limitAccount('identifier'), async (c) =>
    ok(c, await authService(c).login(c.req.valid('json'))),
  )
  routes.post('/guest', rateLimit({ ...GUEST_LIMIT, key: clientIp }), async (c) =>
    ok(c, await authService(c).guest(), 201),
  )
  routes.post(
    '/upgrade',
    requireUser(),
    validate('json', UpgradeBody),
    ...limitAccount('email'),
    async (c) => ok(c, await authService(c).upgrade(c.get('user'), c.req.valid('json'))),
  )
  routes.post('/reset', validate('json', ResetBody), ...limitAccount('email'), async (c) =>
    ok(c, await authService(c).reset(c.req.valid('json'))),
  )
  return routes
}
