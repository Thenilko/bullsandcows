import { env as workerEnv } from 'cloudflare:workers'
import { GameViewDto, GuessResultDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv, type Env } from '../../env'
import { createApp } from '../app'

const clock = { now: () => Date.parse('2026-10-20T09:00:00Z') }
let seq = 0
/** Unique user per test: the rate limiter store is shared by the isolate. */
const newUser = () => {
  seq += 1
  return `rt-user-${seq}-${crypto.randomUUID().slice(0, 8)}`
}

function makeApp(over: Partial<Env> = {}) {
  return createApp({
    env: { ...parseEnv(workerEnv), ...over },
    repo: createMemoryRepo(clock),
    auth: createFakeAuth(clock),
    clock,
  })
}

type App = ReturnType<typeof makeApp>

const call = (app: App, user: string, method: string, path: string, body?: unknown, extra = {}) =>
  app.request(path, {
    method,
    headers: {
      Authorization: `Bearer fake:${user}:${user}`,
      'Content-Type': 'application/json',
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response) => (await res.json()) as { ok: boolean; data?: any; error?: any }

async function newFree(app: App, user: string, secret?: string) {
  const res = await call(
    app,
    user,
    'POST',
    '/api/games',
    { len: 4, zero: false, kind: 'free' },
    secret ? { 'x-test-secret': secret } : {},
  )
  return { res, body: await json(res) }
}

describe('solo game routes', () => {
  it('reports the number of the day and whether the player has finished it', async () => {
    const app = makeApp()
    const user = newUser()
    const before = await json(await call(app, user, 'GET', '/api/games/daily?len=4&zero=false'))
    expect(before.data).toEqual({ number: expect.any(Number), played: null })

    const daily = await json(
      await call(app, user, 'POST', '/api/games', { len: 4, zero: false, kind: 'daily' }),
    )
    await call(app, user, 'POST', `/api/games/${daily.data.id}/start`)
    await call(app, user, 'POST', `/api/games/${daily.data.id}/give-up`)

    const after = await json(await call(app, user, 'GET', '/api/games/daily?len=4&zero=false'))
    expect(after.data.played).toEqual({ won: false, attempts: 0 })
    const other = await json(await call(app, user, 'GET', '/api/games/daily?len=5&zero=false'))
    expect(other.data.played).toBeNull()
    expect((await call(app, user, 'GET', '/api/games/daily?len=7&zero=false')).status).toBe(400)
  })

  it('plays a full game inside the ApiResult envelope', async () => {
    const app = makeApp()
    const user = newUser()
    const { res, body } = await newFree(app, user, '1234')
    expect(res.status).toBe(201)
    expect(body.ok).toBe(true)
    const view = GameViewDto.parse(body.data)
    const base = `/api/games/${view.id}`

    const started = await json(await call(app, user, 'POST', `${base}/start`))
    expect(started.data.startedAt).toBeTypeOf('number')

    const wrong = await json(await call(app, user, 'POST', `${base}/guesses`, { guess: '5678' }))
    expect(GuessResultDto.parse(wrong.data)).toMatchObject({ solved: false, left: 120 })

    const win = await json(await call(app, user, 'POST', `${base}/guesses`, { guess: '1234' }))
    expect(win).toMatchObject({ ok: true, data: { solved: true, bulls: 4 } })

    const final = await json(await call(app, user, 'GET', base))
    expect(GameViewDto.parse(final.data)).toMatchObject({ secret: '1234', won: true })
    const again = await call(app, user, 'POST', `${base}/guesses`, { guess: '9871' })
    expect(again.status).toBe(409)
    expect(await json(again)).toEqual({ ok: false, error: { code: 'ERR_FINISHED' } })
  })

  it('gives up with the secret', async () => {
    const app = makeApp()
    const user = newUser()
    const { body } = await newFree(app, user, '4321')
    const res = await call(app, user, 'POST', `/api/games/${body.data.id}/give-up`)
    expect(await json(res)).toEqual({ ok: true, data: { secret: '4321' } })
  })

  it('rejects bad input and bad guesses', async () => {
    const app = makeApp()
    const user = newUser()
    const bad = await call(app, user, 'POST', '/api/games', { len: 6, zero: false, kind: 'free' })
    expect(bad.status).toBe(400)
    expect(await json(bad)).toEqual({ ok: false, error: { code: 'ERR_INPUT' } })

    const { body } = await newFree(app, user, '1234')
    const base = `/api/games/${body.data.id}`
    await call(app, user, 'POST', `${base}/start`)
    for (const guess of ['12', 'abcd']) {
      const res = await call(app, user, 'POST', `${base}/guesses`, { guess })
      expect(res.status).toBe(400)
      expect(await json(res)).toEqual({ ok: false, error: { code: 'ERR_CODE' } })
    }
    const notString = await call(app, user, 'POST', `${base}/guesses`, { guess: 1234 })
    expect(await json(notString)).toEqual({ ok: false, error: { code: 'ERR_INPUT' } })
    await call(app, user, 'POST', `${base}/guesses`, { guess: '5678' })
    const repeat = await call(app, user, 'POST', `${base}/guesses`, { guess: '5678' })
    expect(repeat.status).toBe(409)
  })

  it('maps not started to 409', async () => {
    const app = makeApp()
    const user = newUser()
    const { body } = await newFree(app, user, '1234')
    const path = `/api/games/${body.data.id}/guesses`
    const res = await call(app, user, 'POST', path, { guess: '5678' })
    expect(res.status).toBe(409)
    expect(await json(res)).toEqual({ ok: false, error: { code: 'ERR_NOT_STARTED' } })
  })

  it('requires a signed-in user but lets guests play', async () => {
    const app = makeApp()
    const anon = await app.request('/api/games', { method: 'POST' })
    expect(anon.status).toBe(401)
    const guest = await app.request('/api/games', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake:guest-9:g:guest', 'Content-Type': 'application/json' },
      body: JSON.stringify({ len: 3, zero: true, kind: 'daily' }),
    })
    expect(guest.status).toBe(201)
  })

  it("hides another user's game and unknown ids with 404", async () => {
    const app = makeApp()
    const owner = newUser()
    const { body } = await newFree(app, owner, '1234')
    for (const [user, id] of [
      [newUser(), body.data.id],
      [owner, crypto.randomUUID()],
      [owner, 'not-a-uuid'],
    ] as const) {
      const res = await call(app, user, 'GET', `/api/games/${id}`)
      expect(res.status).toBe(404)
      expect(await json(res)).toEqual({ ok: false, error: { code: 'ERR_NOT_FOUND' } })
    }
  })

  it('never sends the secret before the game ends', async () => {
    const app = makeApp()
    const user = newUser()
    const { res, body } = await newFree(app, user, '1234')
    expect(res.status).toBe(201)
    expect(JSON.stringify(body)).not.toContain('secret')
    expect(JSON.stringify(body)).not.toContain('1234')
    const base = `/api/games/${body.data.id}`
    await call(app, user, 'POST', `${base}/start`)
    await call(app, user, 'POST', `${base}/guesses`, { guess: '5678' })
    const text = await (await call(app, user, 'GET', base)).text()
    expect(text).not.toContain('secret')
    expect(text).not.toContain('1234')
  })

  it('rate limits guesses at 20 per 10 seconds per user', async () => {
    const app = makeApp()
    const user = newUser()
    const { body } = await newFree(app, user, '1234')
    const path = `/api/games/${body.data.id}/guesses`
    const statuses: number[] = []
    for (let i = 0; i < 21; i++) {
      statuses.push((await call(app, user, 'POST', path, { guess: '5678' })).status)
    }
    expect(statuses.slice(0, 20)).not.toContain(429)
    expect(statuses[20]).toBe(429)
    const limited = await call(app, user, 'POST', path, { guess: '5678' })
    expect(await json(limited)).toEqual({ ok: false, error: { code: 'ERR_RATE_LIMIT' } })
    const other = await call(app, newUser(), 'POST', path, { guess: '5678' })
    expect(other.status).not.toBe(429)
  })
})

describe('test secret hook', () => {
  const secretOf = async (app: App, user: string, id: string) =>
    (await json(await call(app, user, 'POST', `/api/games/${id}/give-up`))).data.secret as string

  it('uses x-test-secret for free games in test and dev', async () => {
    for (const environment of ['test', 'dev'] as const) {
      const app = makeApp({ ENVIRONMENT: environment })
      const user = newUser()
      const { body } = await newFree(app, user, '9876')
      expect(await secretOf(app, user, body.data.id)).toBe('9876')
    }
  })

  it('ignores the header outside dev and test, and for daily games', async () => {
    const prod = makeApp({ ENVIRONMENT: 'production' })
    const user = newUser()
    const { body } = await newFree(prod, user, '9876')
    expect(await secretOf(prod, user, body.data.id)).not.toBe('9876')

    const app = makeApp({ ENVIRONMENT: 'test' })
    const u2 = newUser()
    const daily = { len: 4, zero: false, kind: 'daily' }
    const res = await call(app, u2, 'POST', '/api/games', daily, { 'x-test-secret': '9876' })
    const id = (await json(res)).data.id
    expect(await secretOf(app, u2, id)).not.toBe('9876')
  })

  it('rejects an invalid test secret', async () => {
    const { res } = await newFree(makeApp(), newUser(), '1123')
    expect(res.status).toBe(400)
  })
})
