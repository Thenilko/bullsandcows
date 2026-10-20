import { env as workerEnv } from 'cloudflare:workers'
import { AuthResponseDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv } from '../../env'
import { createApp } from '../app'
import { AppError } from '../errors'

const clock = { now: () => Date.parse('2026-10-20T09:00:00Z') }
let seq = 0
/** Unique IP and names per test: the rate limiter store is shared by the isolate. */
const unique = () => {
  seq += 1
  return `${seq}-${crypto.randomUUID().slice(0, 6)}`
}

function makeApp() {
  return createApp({
    env: parseEnv(workerEnv),
    repo: createMemoryRepo(clock),
    auth: createFakeAuth(clock),
    clock,
  })
}

type App = ReturnType<typeof makeApp>

const post = (app: App, ip: string, path: string, body?: unknown, token?: string) =>
  app.request(`/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-connecting-ip': ip,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response) => (await res.json()) as { ok: boolean; data?: any; error?: any }

const account = (id: string) => ({
  username: `Mira ${id}`.slice(0, 20),
  email: `Mira.${id}@Example.com`,
  password: 'secret1',
})

describe('auth routes', () => {
  it('registers, then logs in by name and by email', async () => {
    const app = makeApp()
    const ip = `10.0.0.${unique()}`
    const acc = account(unique())
    const reg = await post(app, ip, 'register', { ...acc, username: `  ${acc.username} ` })
    expect(reg.status).toBe(201)
    const { session, me } = AuthResponseDto.parse((await json(reg)).data)
    expect(me.profile).toMatchObject({ username: acc.username, isGuest: false })

    const byName = await post(app, ip, 'login', {
      identifier: acc.username.toUpperCase(),
      password: 'secret1',
    })
    expect(byName.status).toBe(200)
    expect(AuthResponseDto.parse((await json(byName)).data).me.profile.id).toBe(session.user.id)
    const byEmail = await post(app, ip, 'login', { identifier: acc.email, password: 'secret1' })
    expect(byEmail.status).toBe(200)
  })

  it('maps a taken name, bad credentials and bad input to codes', async () => {
    const app = makeApp()
    const ip = `10.0.1.${unique()}`
    const acc = account(unique())
    await post(app, ip, 'register', acc)
    const taken = await post(app, ip, 'register', {
      ...acc,
      username: acc.username.toLowerCase(),
      email: 'x@example.com',
    })
    expect(taken.status).toBe(409)
    expect(await json(taken)).toEqual({ ok: false, error: { code: 'ERR_USERNAME_TAKEN' } })
    for (const identifier of ['nobody', acc.username]) {
      const res = await post(app, ip, 'login', { identifier, password: 'wrong-password' })
      expect(res.status).toBe(401)
      expect(await json(res)).toEqual({ ok: false, error: { code: 'ERR_CREDENTIALS' } })
    }
    const short = await post(app, ip, 'register', { ...account(unique()), password: '123' })
    expect(await json(short)).toEqual({ ok: false, error: { code: 'ERR_INPUT' } })
  })

  it('creates a guest and upgrades it with a fresh member session', async () => {
    const app = makeApp()
    const ip = `10.0.2.${unique()}`
    const guest = await post(app, ip, 'guest')
    expect(guest.status).toBe(201)
    const g = AuthResponseDto.parse((await json(guest)).data)
    expect(g.me.profile.username).toMatch(/^guest-[A-HJ-NP-Z2-9]{4}$/)
    expect(g.session.user.isGuest).toBe(true)

    const unauth = await post(app, ip, 'upgrade', account(unique()))
    expect(unauth.status).toBe(401)
    const acc = account(unique())
    const up = await post(app, ip, 'upgrade', acc, g.session.accessToken)
    expect(up.status).toBe(200)
    const u = AuthResponseDto.parse((await json(up)).data)
    expect(u.session.user).toEqual({ id: g.session.user.id, isGuest: false })
    expect(u.me.profile).toMatchObject({ username: acc.username, isGuest: false })
    const again = await post(app, ip, 'upgrade', account(unique()), u.session.accessToken)
    expect(await json(again)).toEqual({ ok: false, error: { code: 'ERR_INPUT' } })
    const replay = await post(app, ip, 'upgrade', account(unique()), g.session.accessToken)
    expect(replay.status).toBe(400)
    expect(await json(replay)).toEqual({ ok: false, error: { code: 'ERR_INPUT' } })
  })

  it('only ensures the profile when a guest signed in on the client (Bearer of an anonymous user)', async () => {
    const app = makeApp()
    const ip = `10.0.6.${unique()}`
    const id = crypto.randomUUID()
    const token = `fake:${id}:anon:guest`
    const first = await post(app, ip, 'guest', {}, token)
    expect(first.status).toBe(200)
    const body = (await json(first)).data
    expect(body.session).toBeNull()
    expect(body.me.profile).toMatchObject({ id, isGuest: true })
    expect(body.me.profile.username).toMatch(/^guest-[A-HJ-NP-Z2-9]{4}$/)
    const again = (await json(await post(app, ip, 'guest', {}, token))).data
    expect(again.me.profile.username).toBe(body.me.profile.username)
  })

  it('refuses a guest call with a member or invalid Bearer', async () => {
    const app = makeApp()
    const ip = `10.0.7.${unique()}`
    const member = await post(app, ip, 'guest', {}, `fake:${crypto.randomUUID()}:mira`)
    expect(await json(member)).toEqual({ ok: false, error: { code: 'ERR_INPUT' } })
    expect((await post(app, ip, 'guest', {}, 'garbage')).status).toBe(401)
  })

  it('answers 502, not 401, when the token cannot be checked', async () => {
    const app = createApp({
      env: parseEnv(workerEnv),
      repo: createMemoryRepo(clock),
      auth: { ...createFakeAuth(clock), verify: async () => Promise.reject(new AppError('ERR_INTERNAL', 502)) },
      clock,
    })
    const res = await app.request('/api/me', { headers: { Authorization: 'Bearer x' } })
    expect(res.status).toBe(502)
    expect(await json(res)).toEqual({ ok: false, error: { code: 'ERR_INTERNAL' } })
  })

  it('always answers sent for a reset', async () => {
    const app = makeApp()
    const ip = `10.0.3.${unique()}`
    const res = await post(app, ip, 'reset', { email: 'nobody@example.com' })
    expect(await json(res)).toEqual({ ok: true, data: { sent: true } })
    const bad = await post(app, ip, 'reset', { email: 'nope' })
    expect(bad.status).toBe(400)
  })

  it('limits account calls to 10 a minute per IP and account', async () => {
    const app = makeApp()
    const ip = `10.0.4.${unique()}`
    for (let i = 0; i < 10; i += 1) {
      expect((await post(app, ip, 'reset', { email: 'a@example.com' })).status).toBe(200)
    }
    const limited = await post(app, ip, 'reset', { email: 'A@Example.com' })
    expect(limited.status).toBe(429)
    expect(await json(limited)).toEqual({ ok: false, error: { code: 'ERR_RATE_LIMIT' } })
    expect((await post(app, ip, 'reset', { email: 'b@example.com' })).status).toBe(200)
    expect((await post(app, `${ip}-other`, 'reset', { email: 'a@example.com' })).status).toBe(200)
  })

  it('limits logins per IP and identifier', async () => {
    const app = makeApp()
    const ip = `10.0.6.${unique()}`
    const login = (identifier: string) => post(app, ip, 'login', { identifier, password: 'wrong1' })
    for (let i = 0; i < 10; i += 1) expect((await login('mira')).status).not.toBe(429)
    expect((await login('MIRA')).status).toBe(429)
    expect((await login('boris')).status).not.toBe(429)
  })

  it('caps account calls at 30 a minute per IP across identifiers', async () => {
    const app = makeApp()
    const ip = `10.0.7.${unique()}`
    for (let i = 0; i < 30; i += 1) {
      const res = await post(app, ip, 'login', { identifier: `spray-${i}`, password: 'wrong1' })
      expect(res.status).not.toBe(429)
    }
    const limited = await post(app, ip, 'login', { identifier: 'spray-30', password: 'wrong1' })
    expect(limited.status).toBe(429)
    expect((await post(app, ip, 'reset', { email: 'd@example.com' })).status).toBe(429)
    expect((await post(app, ip, 'guest')).status).toBe(201)
    expect((await post(app, `${ip}-other`, 'login', { identifier: 'spray-0', password: 'wrong1' })).status).not.toBe(429)
  })

  it('allows 60 guests a minute per IP, apart from the account limit', async () => {
    const app = makeApp()
    const ip = `10.0.5.${unique()}`
    for (let i = 0; i < 60; i += 1) expect((await post(app, ip, 'guest')).status).toBe(201)
    expect((await post(app, ip, 'guest')).status).toBe(429)
    expect((await post(app, ip, 'reset', { email: 'c@example.com' })).status).toBe(200)
    expect((await post(app, `${ip}-other`, 'guest')).status).toBe(201)
  })
})
