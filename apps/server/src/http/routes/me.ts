import { SettingsPatch } from '@bc/protocol'
import { Hono } from 'hono'
import { requireUser } from '../middleware/auth'
import { ok } from '../respond'
import { statsService } from '../services'
import type { AppEnv } from '../types'
import { validate } from '../validate'

/** Profile and settings; guests have a profile too. */
export function meRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireUser())
  routes.get('/', async (c) => ok(c, await statsService(c).me(c.get('user'))))
  routes.patch('/settings', validate('json', SettingsPatch), async (c) =>
    ok(c, await statsService(c).updateSettings(c.get('user'), c.req.valid('json'))),
  )
  return routes
}
