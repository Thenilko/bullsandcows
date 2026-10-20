import { env as workerEnv, exports } from 'cloudflare:workers'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createFakeAuth } from '../adapters/auth/fake'
import { createMemoryRepo } from '../adapters/repo/memory'
import { parseEnv } from '../env'
import { createApp } from './app'
import { AppError } from './errors'
import { requireMember, requireUser } from './middleware/auth'
import { ok } from './respond'
import { validate } from './validate'

const clock = { now: () => 1_000 }

function makeTestApp() {
  const app = createApp({
    env: parseEnv(workerEnv),
    repo: createMemoryRepo(clock),
    auth: createFakeAuth(clock),
    clock,
  })
  app.get('/api/test/member', requireMember(), (c) => ok(c, { id: c.get('user').id }))
  app.get('/api/test/user', requireUser(), (c) => ok(c, c.get('user')))
  app.post('/api/test/echo', validate('json', z.object({ n: z.number() })), (c) =>
    ok(c, c.req.valid('json')),
  )
  app.get('/api/test/app-error', () => {
    throw new AppError('ERR_ROOM_FULL', 409)
  })
  app.get('/api/test/boom', () => {
    throw new Error('kaboom')
  })
  return app
}

const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api app', () => {
  it('answers health with the envelope', async () => {
    const res = await makeTestApp().request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, data: { status: 'ok' } })
  })

  it('sets security headers on api responses', async () => {
    for (const path of ['/api/health', '/api/me', '/api/nowhere']) {
      const res = await makeTestApp().request(path)
      expect(res.headers.get('X-Content-Type-Options'), path).toBe('nosniff')
      expect(res.headers.get('Referrer-Policy'), path).toBe('strict-origin-when-cross-origin')
      expect(res.headers.get('Cache-Control'), path).toBe('no-store')
      expect(res.headers.get('Access-Control-Allow-Origin'), path).toBeNull()
    }
  })

  it('rejects /api/me without a bearer token', async () => {
    const res = await makeTestApp().request('/api/me')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: { code: 'ERR_AUTH' } })
  })

  it('rejects an invalid bearer token', async () => {
    const res = await makeTestApp().request('/api/test/user', bearer('nonsense'))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: { code: 'ERR_AUTH' } })
  })

  it('lets a guest through requireUser but not requireMember', async () => {
    const app = makeTestApp()
    const asUser = await app.request('/api/test/user', bearer('fake:u2:g:guest'))
    expect(await asUser.json()).toEqual({ ok: true, data: { id: 'u2', isGuest: true } })
    const asMember = await app.request('/api/test/member', bearer('fake:u2:g:guest'))
    expect(asMember.status).toBe(403)
    expect(await asMember.json()).toEqual({ ok: false, error: { code: 'ERR_GUEST' } })
  })

  it('lets a member through requireMember', async () => {
    const res = await makeTestApp().request('/api/test/member', bearer('fake:u1:Mira'))
    expect(await res.json()).toEqual({ ok: true, data: { id: 'u1' } })
  })

  it('returns the profile of the authenticated user from /api/me', async () => {
    const res = await makeTestApp().request('/api/me', bearer('fake:u1:Mira'))
    const body = (await res.json()) as { ok: boolean; data: { profile: unknown } }
    expect(body.ok).toBe(true)
    expect(body.data.profile).toMatchObject({ id: 'u1', isGuest: false })
  })

  it('maps validation failures and malformed json to ERR_INPUT', async () => {
    const app = makeTestApp()
    const post = (body: string) =>
      app.request('/api/test/echo', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
      })
    const good = await post('{"n":1}')
    expect(await good.json()).toEqual({ ok: true, data: { n: 1 } })
    for (const body of ['{"n":"x"}', '{not json']) {
      const res = await post(body)
      expect(res.status, body).toBe(400)
      expect(await res.json()).toEqual({ ok: false, error: { code: 'ERR_INPUT' } })
    }
  })

  it('maps AppError, unknown routes and unexpected errors to the envelope', async () => {
    const app = makeTestApp()
    const appError = await app.request('/api/test/app-error')
    expect(appError.status).toBe(409)
    expect(await appError.json()).toEqual({ ok: false, error: { code: 'ERR_ROOM_FULL' } })
    const missing = await app.request('/api/nowhere')
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ ok: false, error: { code: 'ERR_NOT_FOUND' } })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const boom = await app.request('/api/test/boom')
    expect(boom.status).toBe(500)
    expect(await boom.json()).toEqual({ ok: false, error: { code: 'ERR_INTERNAL' } })
    expect(logged).toHaveBeenCalledTimes(1)
  })
})

/** A cold Worker isolate can take seconds to start under full parallel load. */
const WORKER_TEST_MS = 15_000

describe('worker entry', { timeout: WORKER_TEST_MS }, () => {
  beforeAll(async () => {
    // Warm the Worker once so the first test does not pay for the isolate start-up.
    await (await exports.default.fetch('http://localhost/api/health')).text()
  }, WORKER_TEST_MS)

  it('routes /api to the app', async () => {
    const res = await exports.default.fetch('http://localhost/api/health')
    expect(await res.json()).toEqual({ ok: true, data: { status: 'ok' } })
  })

  it('runs the keep-alive cron without throwing', async () => {
    const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} }
    const { default: worker } = await import('../index')
    await expect(
      worker.scheduled(
        {
          cron: '0 6 * * *',
          scheduledTime: 0,
          type: 'scheduled',
          noRetry: vi.fn(),
        } as ScheduledController,
        workerEnv,
        ctx as unknown as ExecutionContext,
      ),
    ).resolves.toBeUndefined()
  })
})
