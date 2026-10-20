import { isValidCode } from '@bc/game-core'
import { CreateGameBody, GuessBody, type ErrorCode } from '@bc/protocol'
import { Hono, type Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { SoloError, SoloService } from '../../solo/service'
import { AppError } from '../errors'
import { requireUser } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import { ok } from '../respond'
import type { AppEnv } from '../types'
import { validate } from '../validate'

const GUESS_LIMIT = { max: 20, windowMs: 10_000 } as const
const TEST_SECRET_HEADER = 'x-test-secret'
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

/** The E2E secret override exists only in dev and test; elsewhere the header is never read. */
function testSecret(c: Context<AppEnv>): string | undefined {
  const { ENVIRONMENT } = c.get('deps').env
  if (ENVIRONMENT !== 'dev' && ENVIRONMENT !== 'test') return undefined
  return c.req.header(TEST_SECRET_HEADER)
}

function service(c: Context<AppEnv>): SoloService {
  const { repo, clock, env } = c.get('deps')
  return new SoloService({ repo, clock, dailySalt: env.DAILY_SALT })
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
    const secretOverride = body.kind === 'free' ? testSecret(c) : undefined
    if (secretOverride !== undefined && !isValidCode(secretOverride, body.len, body.zero)) {
      throw new AppError('ERR_CODE', 400)
    }
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
      const { guess } = c.req.valid('json')
      return ok(c, await run(() => service(c).guess(c.get('user'), gameId(c), guess)))
    },
  )

  routes.post('/:id/give-up', async (c) =>
    ok(c, await run(() => service(c).giveUp(c.get('user'), gameId(c)))),
  )

  routes.get('/:id', async (c) => ok(c, await run(() => service(c).get(c.get('user'), gameId(c)))))

  return routes
}
