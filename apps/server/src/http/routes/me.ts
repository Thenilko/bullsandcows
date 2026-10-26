import { PasturePatch, SettingsPatch } from '@bc/protocol'
import { Hono } from 'hono'
import { requireUser } from '../middleware/auth'
import { ok } from '../respond'
import { getPasture, patchPasture } from '../../stats/pasture'
import { statsService } from '../services'
import type { AppEnv } from '../types'
import { validate } from '../validate'

/** Profile and settings; guests have a profile too. */
export function meRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireUser())
  routes.get('/', async (c) => ok(c, await statsService(c).me(c.get('user'))))
  routes.get('/badges', async (c) => ok(c, await statsService(c).badges(c.get('user'))))
  routes.patch('/settings', validate('json', SettingsPatch), async (c) =>
    ok(c, await statsService(c).updateSettings(c.get('user'), c.req.valid('json'))),
  )
  routes.get('/pasture', async (c) => ok(c, await getPasture(c.get('deps').repo, c.get('user'))))
  routes.patch('/pasture', validate('json', PasturePatch), async (c) =>
    ok(c, await patchPasture(c.get('deps').repo, c.get('user'), c.req.valid('json'))),
  )
  return routes
}
