import { Hono } from 'hono'
import { adminOverview } from '../../admin/overview'
import { requireAdmin } from '../middleware/auth'
import { ok } from '../respond'
import type { AppEnv } from '../types'

/** `/api/admin/*`: read-only numbers for the admin (`app_metadata.role = 'admin'`); 403 for everyone else. */
export function adminRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireAdmin())
  routes.get('/overview', async (c) => {
    const { repo, clock } = c.get('deps')
    return ok(c, await adminOverview({ repo, clock }))
  })
  return routes
}
