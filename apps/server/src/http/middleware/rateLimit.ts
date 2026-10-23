import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { fail } from '../respond'
import type { AppEnv } from '../types'

export interface RateLimitOptions {
  /** Requests allowed per `windowMs` for one key. */
  readonly max: number
  readonly windowMs: number
  /** Who is being limited: a user id, an IP, ... */
  readonly key: (c: Context<AppEnv>) => string
  /** Separates limiters that share the isolate-wide store. */
  readonly name?: string
}

/** Hits per limiter key in this isolate. Module-level: the app is rebuilt for every request. */
const hits = new Map<string, number[]>()

const SWEEP_ABOVE = 5_000

function sweep(now: number, windowMs: number): void {
  for (const [key, times] of hits) {
    if (times.every((t) => now - t >= windowMs)) hits.delete(key)
  }
}

/** Sliding-window limiter held in isolate memory; over the limit gives 429 `ERR_RATE_LIMIT`. */
export const rateLimit = (options: RateLimitOptions) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const now = c.get('deps').clock.now()
    const id = `${options.name ?? 'default'}:${options.key(c)}`
    const recent = (hits.get(id) ?? []).filter((t) => now - t < options.windowMs)
    if (recent.length >= options.max) {
      hits.set(id, recent)
      return fail(c, 'ERR_RATE_LIMIT', 429)
    }
    hits.set(id, [...recent, now])
    if (hits.size > SWEEP_ABOVE) sweep(now, options.windowMs)
    await next()
  })

/** Client address as Cloudflare reports it; for limiting routes that have no user yet. */
export const clientIp = (c: Context<AppEnv>): string =>
  c.req.header('cf-connecting-ip') ?? 'unknown'
