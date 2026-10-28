import { apiErr, type ErrorCode } from '@bc/protocol'
import { makeAuth } from './adapters/auth'
import { makeRepo } from './adapters/repo'
import { parseEnv, type Env } from './env'
import { createApp } from './http/app'
import { SECURITY_HEADERS } from './http/middleware/headers'
import { systemClock } from './ports/clock'
import { DuelRoom } from './rooms/DuelRoom'
import { QueueRoom } from './rooms/QueueRoom'
import { authenticateWs, forwardWithIdentity } from './rooms/wsAuth'
import { finalizeDueWeeks } from './weekly/finalize'
import { purgeInactiveGuests } from './auth/guestCleanup'

const parsedEnvs = new WeakMap<object, Env>()

/** Validates the bindings once per isolate; throws a message without secret values. */
function loadEnv(raw: CloudflareBindings): Env {
  const cached = parsedEnvs.get(raw)
  if (cached) return cached
  const env = parseEnv(raw)
  parsedEnvs.set(raw, env)
  return env
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : 'unknown error')

const notImplemented = (): Response => new Response('Not implemented', { status: 501 })

async function handleApi(
  request: Request,
  raw: CloudflareBindings,
  ctx: ExecutionContext,
): Promise<Response> {
  let env: Env
  try {
    env = loadEnv(raw)
  } catch (err) {
    console.error(errorText(err))
    return Response.json(apiErr('ERR_INTERNAL'), { status: 500, headers: SECURITY_HEADERS })
  }
  // Built per request: a postgres client must not outlive the request that opened it.
  const repo = makeRepo(env)
  const app = createApp({ env, repo, auth: makeAuth(env), clock: systemClock })
  try {
    return await app.fetch(request, env, ctx)
  } finally {
    ctx.waitUntil(repo.close())
  }
}

const reject = (code: ErrorCode, status: number): Response =>
  Response.json(apiErr(code), { status, headers: SECURITY_HEADERS })

/** `/ws/queue`: authenticate and reject guests before the upgrade, then hand over to the lobby. */
async function handleQueueWs(request: Request, raw: CloudflareBindings): Promise<Response> {
  let env: Env
  try {
    env = loadEnv(raw)
  } catch (err) {
    console.error(errorText(err))
    return reject('ERR_INTERNAL', 500)
  }
  let auth: Awaited<ReturnType<typeof authenticateWs>>
  try {
    auth = await authenticateWs(request, env, { allowGuests: false })
  } catch (err) {
    // Key set or database unavailable: an envelope, never a 401 that would end the session.
    console.error(`ws auth failed: ${errorText(err)}`)
    return reject('ERR_INTERNAL', 502)
  }
  if (auth instanceof Response) return auth
  return env.QUEUE.get(env.QUEUE.idFromName('lobby')).fetch(forwardWithIdentity(request, auth.info))
}

const DUEL_WS = /^\/ws\/duel\/([^/]+)$/
/** `DurableObjectId.toString()`: 64 lowercase hex digits. Checked before any decoding. */
const ROOM_ID = /^[0-9a-f]{64}$/

function duelId(ns: DurableObjectNamespace, roomId: string): DurableObjectId | null {
  try {
    return ns.idFromString(roomId)
  } catch {
    return null
  }
}

/**
 * `/ws/duel/:roomId?token=&auth=`: verifies the access token (guests allowed: friend invites
 * and bots) BEFORE the upgrade, then hands the socket to the room as `GET /ws?token=` with
 * identity headers only the Worker sets. The seat token is checked by the room.
 */
async function handleDuelWs(request: Request, raw: CloudflareBindings, roomId: string) {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    return reject('ERR_INPUT', 426)
  }
  if (!ROOM_ID.test(roomId)) return reject('ERR_NOT_FOUND', 404)
  let env: Env
  try {
    env = loadEnv(raw)
  } catch (err) {
    console.error(errorText(err))
    return reject('ERR_INTERNAL', 500)
  }
  const id = duelId(env.DUEL, roomId)
  if (!id) return reject('ERR_NOT_FOUND', 404)
  let auth: Awaited<ReturnType<typeof authenticateWs>>
  try {
    auth = await authenticateWs(request, env, { allowGuests: true })
  } catch (err) {
    console.error(`ws auth failed: ${errorText(err)}`)
    return reject('ERR_INTERNAL', 500)
  }
  if (auth instanceof Response) return auth
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const inner = new Request(`https://room/ws?token=${encodeURIComponent(token)}`, request)
  return env.DUEL.get(id).fetch(forwardWithIdentity(inner, auth.info))
}

/**
 * Hashed build files under /assets: a miss answers 404, never the SPA shell that the asset
 * binding's single-page-application mode would return (a page from an older deploy asking for
 * a chunk that is gone must see an error and reload, not parse HTML as a script).
 */
async function serveAsset(request: Request, raw: CloudflareBindings): Promise<Response> {
  const res = await raw.ASSETS.fetch(request)
  const html = res.headers.get('content-type')?.startsWith('text/html') ?? false
  return res.ok && html ? new Response('Not found', { status: 404, headers: SECURITY_HEADERS }) : res
}

/** The daily cron: deletes inactive guests; the query also keeps the Supabase project active. */
async function dailyCleanup(
  raw: CloudflareBindings,
  ctx: ExecutionContext,
  now: number,
): Promise<void> {
  try {
    const env = loadEnv(raw)
    const repo = makeRepo(env)
    try {
      const { deleted, authFailures } = await purgeInactiveGuests(repo, makeAuth(env), now)
      if (deleted > 0) console.info(`inactive guests deleted: ${deleted}`)
      if (authFailures > 0) console.error(`guest auth users not deleted: ${authFailures}`)
    } finally {
      ctx.waitUntil(repo.close())
    }
  } catch (err) {
    console.error(`daily cleanup failed: ${errorText(err)}`)
  }
}

/**
 * The weekly challenge closes at Monday 00:00 Sofia. Cron Triggers run in UTC, so there are two (21:01 and
 * 22:01 UTC on Sunday: 00:01 in summer and in winter time); the one an hour early finds nothing due yet.
 */
export const WEEKLY_CRONS: readonly string[] = ['1 21 * * SUN', '1 22 * * SUN']

/** Finalises every ended week; idempotent per week, so an extra run (or a lazy one) changes nothing. */
export async function finalizeWeeks(raw: CloudflareBindings, ctx: ExecutionContext, now: number) {
  try {
    const repo = makeRepo(loadEnv(raw))
    try {
      const done = await finalizeDueWeeks(repo, now)
      if (done.length > 0) console.info(`weekly finalised: ${done.join(', ')}`)
    } finally {
      ctx.waitUntil(repo.close())
    }
  } catch (err) {
    console.error(`weekly finalisation failed: ${errorText(err)}`)
  }
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api' || pathname.startsWith('/api/')) return handleApi(request, env, ctx)
    if (pathname === '/ws/queue') return handleQueueWs(request, env)
    const duel = DUEL_WS.exec(pathname)
    if (duel?.[1]) return handleDuelWs(request, env, duel[1])
    if (pathname === '/ws' || pathname.startsWith('/ws/')) return notImplemented()
    if (pathname.startsWith('/assets/')) return serveAsset(request, env)
    return env.ASSETS.fetch(request)
  },
  async scheduled(controller, env, ctx) {
    if (WEEKLY_CRONS.includes(controller.cron)) {
      await finalizeWeeks(env, ctx, controller.scheduledTime)
      return
    }
    await dailyCleanup(env, ctx, controller.scheduledTime)
  },
} satisfies ExportedHandler<CloudflareBindings>

export { QueueRoom }

export { DuelRoom }
