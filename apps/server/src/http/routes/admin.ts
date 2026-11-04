import { Hono } from 'hono'
import { z } from 'zod'
import { adminGame, adminGames } from '../../admin/games'
import { adminOverview } from '../../admin/overview'
import { AppError } from '../errors'
import { requireAdmin } from '../middleware/auth'
import { ok } from '../respond'
import type { AppEnv } from '../types'

const GamesQuery = z.object({
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  user: z.string().min(1).max(64).optional(),
})

/** `/api/admin/*`: read-only numbers for the admin (`app_metadata.role = 'admin'`); 403 for everyone else. */
export function adminRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireAdmin())
  routes.get('/overview', async (c) => {
    const { repo, clock } = c.get('deps')
    return ok(c, await adminOverview({ repo, clock }))
  })
  routes.get('/games', async (c) => {
    const query = GamesQuery.safeParse(c.req.query())
    if (!query.success) throw new AppError('ERR_INPUT', 400)
    const { repo } = c.get('deps')
    return ok(c, await adminGames(repo, { offset: query.data.offset, userId: query.data.user ?? null }))
  })
  routes.get('/games/:id', async (c) => {
    const { repo } = c.get('deps')
    const detail = await adminGame(repo, c.req.param('id'))
    if (!detail) throw new AppError('ERR_NOT_FOUND', 404)
    return ok(c, detail)
  })
  return routes
}
