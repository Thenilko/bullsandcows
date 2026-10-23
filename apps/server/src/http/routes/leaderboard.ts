import { LeaderboardQuery } from '@bc/protocol'
import { Hono } from 'hono'
import { requireMember } from '../middleware/auth'
import { ok } from '../respond'
import { statsService } from '../services'
import type { AppEnv } from '../types'
import { validate } from '../validate'

/** `GET /api/leaderboard?period&len&zero`; members only (guests get 403 `ERR_GUEST`). */
export function leaderboardRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.get('/', requireMember(), validate('query', LeaderboardQuery), async (c) =>
    ok(c, await statsService(c).leaderboard(c.get('user'), c.req.valid('query'))),
  )
  return routes
}
