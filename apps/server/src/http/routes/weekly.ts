import { WeekIdSchema, WeeklyBoardQuery } from '@bc/protocol'
import { Hono, type Context } from 'hono'
import { SoloService } from '../../solo/service'
import { BOARD_LIMIT_DEFAULT, WeeklyService } from '../../weekly/service'
import { AppError } from '../errors'
import { requireMember } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import { ok } from '../respond'
import { statsService } from '../services'
import type { AppEnv } from '../types'
import { validate } from '../validate'
import { run } from './games'

const START_LIMIT = { max: 10, windowMs: 60_000 } as const

function weekly(c: Context<AppEnv>): WeeklyService {
  const { repo, clock, env } = c.get('deps')
  const solo = new SoloService({
    repo,
    clock,
    dailySalt: env.DAILY_SALT,
    distributions: statsService(c),
  })
  return new WeeklyService({ repo, clock, solo })
}

/**
 * „Седмично предизвикателство“ (spec ЧАСТ 3), members only. Guesses go through `/api/games/:id/guesses`
 * like any solo game; the secret never leaves the server before the player's game is over.
 */
export function weeklyRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireMember())

  routes.get('/', async (c) => ok(c, await run(() => weekly(c).overview(c.get('user')))))
  routes.post(
    '/start',
    rateLimit({ ...START_LIMIT, name: 'weekly-start', key: (c) => c.get('user').id }),
    async (c) => ok(c, await run(() => weekly(c).start(c.get('user'))), 201),
  )
  routes.post('/award/seen', async (c) => ok(c, await weekly(c).seen(c.get('user'))))
  routes.get('/:week/board', validate('query', WeeklyBoardQuery), async (c) => {
    const week = WeekIdSchema.safeParse(c.req.param('week'))
    if (!week.success) throw new AppError('ERR_INPUT', 400)
    const limit = c.req.valid('query').limit ?? BOARD_LIMIT_DEFAULT
    return ok(c, await weekly(c).board(c.get('user'), week.data, limit))
  })
  return routes
}
