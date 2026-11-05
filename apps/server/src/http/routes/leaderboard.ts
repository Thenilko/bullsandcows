import { BoardKindSchema, BoardQuery, LeaderboardQuery } from '@bc/protocol'
import { Hono } from 'hono'
import { z } from 'zod'
import { kindBoard } from '../../stats/boards'
import { requireMember, requireUser } from '../middleware/auth'
import { ok } from '../respond'
import { statsService } from '../services'
import type { AppEnv } from '../types'
import { validate } from '../validate'

const KindParam = z.object({ kind: BoardKindSchema })

/**
 * `GET /api/leaderboard?period&len&zero` („Точки“): members get their rows and place; a guest gets the same rows
 * (never with themselves in them) plus `phantom`, the place they would take as a member.
 * `GET /api/leaderboard/:kind?period` (Дуели, Серии, Пастири, Игри, Приятели): members only (guests get 403
 * `ERR_GUEST`).
 */
export function leaderboardRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.get('/', requireUser(), validate('query', LeaderboardQuery), async (c) =>
    ok(c, await statsService(c).leaderboard(c.get('user'), c.req.valid('query'))),
  )
  routes.get(
    '/:kind',
    requireMember(),
    validate('param', KindParam),
    validate('query', BoardQuery),
    async (c) => {
      const { repo, clock } = c.get('deps')
      const { kind } = c.req.valid('param')
      const { period } = c.req.valid('query')
      return ok(c, await kindBoard({ repo, clock }, c.get('user'), kind, period))
    },
  )
  return routes
}
