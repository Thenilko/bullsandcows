import { sofiaDate } from '@bc/game-core'
import { DistributionQuery } from '@bc/protocol'
import { Hono } from 'hono'
import { requireUser } from '../middleware/auth'
import { ok } from '../respond'
import { statsService } from '../services'
import type { AppEnv } from '../types'
import { validate } from '../validate'

/** `GET /api/stats/distribution?len&zero&kind`; guests may read it (they see "top X%"). */
export function statsRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.get('/distribution', requireUser(), validate('query', DistributionQuery), async (c) => {
    const query = c.req.valid('query')
    const date = sofiaDate(new Date(c.get('deps').clock.now()))
    return ok(c, await statsService(c).distribution({ ...query, date }))
  })
  return routes
}
