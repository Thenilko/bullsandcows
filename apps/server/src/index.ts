import { apiErr, type ErrorCode } from '@bc/protocol'
import { DurableObject } from 'cloudflare:workers'
import { makeAuth } from './adapters/auth'
import { makeRepo } from './adapters/repo'
import { parseEnv, type Env } from './env'
import { createApp } from './http/app'
import { SECURITY_HEADERS } from './http/middleware/headers'
import { systemClock } from './ports/clock'
import { DuelRoom } from './rooms/DuelRoom'
import { authenticateWs, forwardWithIdentity } from './rooms/wsAuth'

/** Any id works: the cron only needs one cheap query so Supabase sees activity. */
const KEEP_ALIVE_PROFILE_ID = '00000000-0000-0000-0000-000000000000'

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

const DUEL_WS = /^\/ws\/duel\/([^/]+)$/
/** `DurableObjectId.toString()`: 64 lowercase hex digits. Checked before any decoding. */
const ROOM_ID = /^[0-9a-f]{64}$/

const reject = (code: ErrorCode, status: number): Response =>
  Response.json(apiErr(code), { status, headers: SECURITY_HEADERS })

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

async function keepAlive(raw: CloudflareBindings, ctx: ExecutionContext): Promise<void> {
  try {
    const repo = makeRepo(loadEnv(raw))
    try {
      await repo.profiles.get(KEEP_ALIVE_PROFILE_ID)
    } finally {
      ctx.waitUntil(repo.close())
    }
  } catch (err) {
    console.error(`keep-alive failed: ${errorText(err)}`)
  }
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api' || pathname.startsWith('/api/')) return handleApi(request, env, ctx)
    const duel = DUEL_WS.exec(pathname)
    if (duel?.[1]) return handleDuelWs(request, env, duel[1])
    if (pathname === '/ws' || pathname.startsWith('/ws/')) return notImplemented()
    return env.ASSETS.fetch(request)
  },
  async scheduled(_controller, env, ctx) {
    await keepAlive(env, ctx)
  },
} satisfies ExportedHandler<CloudflareBindings>

/** Matchmaking lobby; implemented by the queue task. */
export class QueueRoom extends DurableObject<CloudflareBindings> {
  async fetch(): Promise<Response> {
    return notImplemented()
  }
}

export { DuelRoom }
