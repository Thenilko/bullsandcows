import { LoginBody, RegisterBody, ResetBody, UpgradeBody } from '@bc/protocol'
import { Hono } from 'hono'
import { requireUser } from '../middleware/auth'
import { clientIp, rateLimit } from '../middleware/rateLimit'
import { ok } from '../respond'
import { authService } from '../services'
import type { AppEnv } from '../types'
import { validate } from '../validate'

const AUTH_LIMIT = { max: 10, windowMs: 60_000 } as const

/** Sign-up, sign-in, guest, guest upgrade and password reset; every route is limited per IP. */
export function authRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', rateLimit({ ...AUTH_LIMIT, name: 'auth', key: clientIp }))

  routes.post('/register', validate('json', RegisterBody), async (c) =>
    ok(c, await authService(c).register(c.req.valid('json')), 201),
  )
  routes.post('/login', validate('json', LoginBody), async (c) =>
    ok(c, await authService(c).login(c.req.valid('json'))),
  )
  routes.post('/guest', async (c) => ok(c, await authService(c).guest(), 201))
  routes.post('/upgrade', requireUser(), validate('json', UpgradeBody), async (c) =>
    ok(c, await authService(c).upgrade(c.get('user'), c.req.valid('json'))),
  )
  routes.post('/reset', validate('json', ResetBody), async (c) =>
    ok(c, await authService(c).reset(c.req.valid('json'))),
  )
  return routes
}
