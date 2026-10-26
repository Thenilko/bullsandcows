import { ShareBody } from '@bc/protocol'
import { Hono } from 'hono'
import { recordShare } from '../../stats/shares'
import { requireUser } from '../middleware/auth'
import { clientIp, rateLimit } from '../middleware/rateLimit'
import { ok } from '../respond'
import type { AppEnv } from '../types'
import { validate } from '../validate'

const SHARE_LIMIT = { max: 30, windowMs: 60_000 } as const
const LANDING_LIMIT = { max: 60, windowMs: 60_000 } as const

/**
 * Shares (spec A §6–7): `POST /` records a shared game for the „teller“ badge; `POST /landing`
 * is hit by a client opened through `?s=share` and only leaves a log line (no user, no body).
 */
export function sharesRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()

  routes.post(
    '/landing',
    rateLimit({ ...LANDING_LIMIT, name: 'share-landing', key: clientIp }),
    (c) => {
      // Measurement only: one line, nothing about the visitor.
      console.info('share landing')
      return ok(c, { logged: true as const })
    },
  )

  routes.post(
    '/',
    requireUser(),
    rateLimit({ ...SHARE_LIMIT, name: 'shares', key: (c) => c.get('user').id }),
    validate('json', ShareBody),
    async (c) => {
      const { repo, clock } = c.get('deps')
      return ok(c, await recordShare(repo, c.get('user'), c.req.valid('json'), clock.now()))
    },
  )

  return routes
}
