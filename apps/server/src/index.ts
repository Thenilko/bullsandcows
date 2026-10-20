import { apiErr } from '@bc/protocol'
import { DurableObject } from 'cloudflare:workers'
import { makeAuth } from './adapters/auth'
import { makeRepo } from './adapters/repo'
import { parseEnv, type Env } from './env'
import { createApp } from './http/app'
import { SECURITY_HEADERS } from './http/middleware/headers'
import { systemClock } from './ports/clock'

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

/** A single duel (race, classic or bot); implemented by the duel tasks. */
export class DuelRoom extends DurableObject<CloudflareBindings> {
  async fetch(): Promise<Response> {
    return notImplemented()
  }
}
