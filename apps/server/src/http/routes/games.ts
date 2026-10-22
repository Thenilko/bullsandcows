import { CreateGameBody, GiveUpBody, GuessBody, type ErrorCode } from '@bc/protocol'
import { Hono, type Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { z } from 'zod'
import { SoloError, SoloService } from '../../solo/service'
import { AppError } from '../errors'
import { requireUser } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import { testSecret } from '../testSecret'
import { ok } from '../respond'
import { statsService } from '../services'
import type { AppEnv } from '../types'
import { validate } from '../validate'

const GUESS_LIMIT = { max: 20, windowMs: 10_000 } as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS: Partial<Record<ErrorCode, ContentfulStatusCode>> = {
  ERR_NOT_FOUND: 404,
  ERR_NOT_STARTED: 409,
  ERR_FINISHED: 409,
  ERR_REPEAT: 409,
  ERR_CODE: 400,
  ERR_INPUT: 400,
  ERR_RATE_LIMIT: 429,
}

/** Runs a service call and turns its `SoloError` into the API error with the right status. */
async function run<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (err) {
    if (err instanceof SoloError) throw new AppError(err.code, STATUS[err.code] ?? 400)
    throw err
  }
}

function service(c: Context<AppEnv>): SoloService {
  const { repo, clock, env } = c.get('deps')
  return new SoloService({ repo, clock, dailySalt: env.DAILY_SALT, distributions: statsService(c) })
}

/** A JSON body is optional on this route (older clients send none); a malformed one is `ERR_INPUT`. */
async function optionalBody<T extends z.ZodObject>(
  c: Context<AppEnv>,
  schema: T,
): Promise<z.infer<T>> {
  const type = c.req.header('content-type') ?? ''
  const raw = c.req.raw.body
  if (!type.toLowerCase().includes('application/json') || raw === null) return schema.parse({})
  const text = await c.req.text()
  if (text.trim() === '') return schema.parse({})
  try {
    return schema.parse(JSON.parse(text))
  } catch {
    throw new AppError('ERR_INPUT', 400)
  }
}

/** A malformed id cannot exist, so it is "not found" (and never reaches a uuid column). */
function gameId(c: Context<AppEnv>): string {
  const id = c.req.param('id') ?? ''
  if (!UUID.test(id)) throw new AppError('ERR_NOT_FOUND', 404)
  return id
}

export function gamesRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireUser())

  routes.post('/', validate('json', CreateGameBody), async (c) => {
    const body = c.req.valid('json')
    const secretOverride = body.kind === 'free' ? testSecret(c, body.len, body.zero) : undefined
    const view = await run(() => service(c).create(c.get('user'), { ...body, secretOverride }))
    return ok(c, view, 201)
  })

  routes.post('/:id/start', async (c) =>
    ok(c, await run(() => service(c).start(c.get('user'), gameId(c)))),
  )

  routes.post(
    '/:id/guesses',
    rateLimit({ ...GUESS_LIMIT, name: 'guesses', key: (c) => c.get('user').id }),
    validate('json', GuessBody),
    async (c) => {
      const { guess, usedNotes } = c.req.valid('json')
      return ok(c, await run(() => service(c).guess(c.get('user'), gameId(c), guess, usedNotes)))
    },
  )

  routes.post('/:id/give-up', async (c) => {
    const { usedNotes } = await optionalBody(c, GiveUpBody)
    return ok(c, await run(() => service(c).giveUp(c.get('user'), gameId(c), usedNotes)))
  })

  routes.get('/:id', async (c) => ok(c, await run(() => service(c).get(c.get('user'), gameId(c)))))

  return routes
}
