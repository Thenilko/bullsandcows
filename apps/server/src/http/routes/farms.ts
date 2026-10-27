import { CreateFarmBody, JoinFarmBody, NudgeBody, RenameFarmBody } from '@bc/protocol'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { FarmService } from '../../farm/service'
import { requireMember } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import { ok } from '../respond'
import type { AppEnv } from '../types'
import { validate } from '../validate'

/** Joining by code is limited, so codes cannot be guessed by brute force. */
const JOIN_LIMIT = { max: 10, windowMs: 60_000 } as const
const WRITE_LIMIT = { max: 30, windowMs: 60_000 } as const

const farms = (c: Context<AppEnv>): FarmService => {
  const { repo, clock } = c.get('deps')
  return new FarmService({ repo, clock })
}

/**
 * „Семейна ферма“ (spec ЧАСТ 2), members only (guests get 403 `ERR_GUEST`): create, join by code, the farm
 * with today's number and the week, owner-only settings, leaving and the daily nudge.
 */
export function farmsRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireMember())
  const writes = rateLimit({ ...WRITE_LIMIT, name: 'farm-writes', key: (c) => c.get('user').id })

  routes.post('/', writes, validate('json', CreateFarmBody), async (c) =>
    ok(c, await farms(c).create(c.get('user'), c.req.valid('json').name), 201),
  )
  routes.post(
    '/join',
    rateLimit({ ...JOIN_LIMIT, name: 'farm-join', key: (c) => c.get('user').id }),
    validate('json', JoinFarmBody),
    async (c) => ok(c, await farms(c).join(c.get('user'), c.req.valid('json').code)),
  )
  routes.get('/me', async (c) => ok(c, { farm: await farms(c).get(c.get('user')) }))
  routes.patch('/me', writes, validate('json', RenameFarmBody), async (c) =>
    ok(c, await farms(c).rename(c.get('user'), c.req.valid('json').name)),
  )
  routes.post('/me/code', writes, async (c) => ok(c, await farms(c).rotateCode(c.get('user'))))
  routes.delete('/me/members/:id', writes, async (c) =>
    ok(c, await farms(c).remove(c.get('user'), c.req.param('id'))),
  )
  routes.post('/me/leave', writes, async (c) => ok(c, await farms(c).leave(c.get('user'))))
  routes.get('/me/nudge', async (c) => ok(c, await farms(c).myNudge(c.get('user'))))
  routes.post('/me/nudge', writes, validate('json', NudgeBody), async (c) =>
    ok(c, await farms(c).nudge(c.get('user'), c.req.valid('json').userId)),
  )
  routes.post('/me/nudge/read', async (c) => ok(c, await farms(c).readNudges(c.get('user'))))
  return routes
}
