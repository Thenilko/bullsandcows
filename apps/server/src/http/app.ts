import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { AppError } from './errors'
import { requireUser } from './middleware/auth'
import { securityHeaders } from './middleware/headers'
import { fail, ok } from './respond'
import type { AppDeps, AppEnv } from './types'

export type { AppDeps, AppEnv } from './types'
export { requireMember, requireUser } from './middleware/auth'

function handleError(err: Error, c: Context<AppEnv>): Response {
  if (err instanceof AppError) return fail(c, err.code, err.status)
  if (err instanceof ZodError) return fail(c, 'ERR_INPUT', 400)
  if (err instanceof HTTPException && err.status === 400) return fail(c, 'ERR_INPUT', 400)
  // One line, no request body or headers: operational signal only.
  console.error(`api ${c.req.method} ${c.req.path} failed: ${err.name}: ${err.message}`)
  return fail(c, 'ERR_INTERNAL', 500)
}

export function createApp(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  app.use('*', securityHeaders())
  app.use('*', async (c, next) => {
    c.set('deps', deps)
    await next()
  })
  app.get('/api/health', (c) => ok(c, { status: 'ok' as const }))
  app.get('/api/me', requireUser(), (c) => ok(c, c.get('user')))
  app.notFound((c) => fail(c, 'ERR_NOT_FOUND', 404))
  app.onError(handleError)
  return app
}
