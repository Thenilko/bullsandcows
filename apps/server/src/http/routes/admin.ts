import { BotConfigDto } from '@bc/protocol'
import { Hono } from 'hono'
import { z } from 'zod'
import { adminBotConfig, resetBotConfig, saveBotConfig } from '../../admin/botConfig'
import { adminGame, adminGames, adminVoidGame } from '../../admin/games'
import { adminDuelStats } from '../../admin/duelStats'
import { adminOnline } from '../../admin/online'
import { adminOverview } from '../../admin/overview'
import { adminUsers } from '../../admin/users'
import { AppError } from '../errors'
import { requireAdmin } from '../middleware/auth'
import { ok } from '../respond'
import type { AppEnv } from '../types'
import { validate } from '../validate'

const UsersQuery = z.object({ offset: z.coerce.number().int().min(0).max(1_000_000).default(0) })

const GamesQuery = z.object({
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  user: z.string().min(1).max(64).optional(),
})

/** `/api/admin/*`: numbers and a few settings for the admin (`app_metadata.role = 'admin'`); 403 for everyone else. */
export function adminRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireAdmin())
  routes.get('/overview', async (c) => {
    const { repo, clock } = c.get('deps')
    return ok(c, await adminOverview({ repo, clock }))
  })
  routes.get('/users', async (c) => {
    const query = UsersQuery.safeParse(c.req.query())
    if (!query.success) throw new AppError('ERR_INPUT', 400)
    return ok(c, await adminUsers(c.get('deps').repo, query.data.offset))
  })
  routes.get('/duels', async (c) => {
    const { repo, clock } = c.get('deps')
    return ok(c, await adminDuelStats({ repo, clock }))
  })
  routes.get('/online', async (c) => {
    const { repo, clock } = c.get('deps')
    return ok(c, await adminOnline({ repo, clock }))
  })
  routes.get('/games', async (c) => {
    const query = GamesQuery.safeParse(c.req.query())
    if (!query.success) throw new AppError('ERR_INPUT', 400)
    const { repo } = c.get('deps')
    return ok(c, await adminGames(repo, { offset: query.data.offset, userId: query.data.user ?? null }))
  })
  routes.post('/games/:id/void', async (c) => {
    const game = await adminVoidGame(c.get('deps').repo, c.req.param('id'))
    if (!game) throw new AppError('ERR_NOT_FOUND', 404)
    return ok(c, game)
  })
  routes.get('/bot', async (c) => ok(c, await adminBotConfig(c.get('deps').repo.settings)))
  routes.put('/bot', validate('json', BotConfigDto), async (c) =>
    ok(c, await saveBotConfig(c.get('deps').repo.settings, c.req.valid('json'))),
  )
  routes.delete('/bot', async (c) => ok(c, await resetBotConfig(c.get('deps').repo.settings)))
  routes.get('/games/:id', async (c) => {
    const { repo } = c.get('deps')
    const detail = await adminGame(repo, c.req.param('id'))
    if (!detail) throw new AppError('ERR_NOT_FOUND', 404)
    return ok(c, detail)
  })
  return routes
}
