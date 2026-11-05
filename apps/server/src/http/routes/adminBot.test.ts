import { env as workerEnv } from 'cloudflare:workers'
import { DEFAULT_BOT_CONFIG } from '@bc/game-core'
import { AdminBotConfigDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import type { Room, RoomClient, RoomOpts } from '../../duel/roomClient'
import { parseEnv } from '../../env'
import type { RepoHandle } from '../../ports/repo'
import { createApp } from '../app'

const clock = { now: () => Date.parse('2026-10-20T09:00:00Z') }
const ADMIN = 'fake:a1:Admin:admin'
const MEMBER = 'fake:m1:Mira'
const GUEST = 'fake:g1:g:guest'

const custom = {
  raceThinkMs: [30000, 20000, 15000, 9000],
  lostHint: [0.7, 0.5, 0.3],
  proSample: 10,
}

/** Fresh rooms that only remember the options they were created with. */
function fakeRooms() {
  const created: RoomOpts[] = []
  const room = (id: string): Room => ({
    id,
    create: async ({ opts }) => {
      created.push(opts)
      return { token: 'tok' }
    },
    join: async () => ({ token: 'tok' }),
    info: async () => null,
  })
  const client: RoomClient = {
    invite: (code) => room(`invite:${code}`),
    fresh: () => room('fresh'),
  }
  return { client, created }
}

function setup(repo: RepoHandle = createMemoryRepo(clock)) {
  const rooms = fakeRooms()
  const app = createApp({
    env: parseEnv(workerEnv),
    repo,
    auth: createFakeAuth(clock),
    clock,
    rooms: rooms.client,
  })
  return { app, repo, created: rooms.created }
}

const call = (
  app: ReturnType<typeof setup>['app'],
  token: string | null,
  method: string,
  path: string,
  body?: unknown,
) => {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  if (body === undefined) return app.request(path, { method, headers })
  return app.request(path, {
    method,
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const data = async (res: Response) =>
  AdminBotConfigDto.parse(((await res.json()) as { data: unknown }).data)

describe('admin bot settings route', () => {
  it('is closed to anonymous, guests and members for every method', async () => {
    const { app } = setup()
    for (const [method, body] of [['GET'], ['PUT', custom], ['DELETE']] as const) {
      expect((await call(app, null, method, '/api/admin/bot', body)).status).toBe(401)
      for (const token of [GUEST, MEMBER]) {
        expect((await call(app, token, method, '/api/admin/bot', body)).status).toBe(403)
      }
    }
  })

  it('reports the built-in values until something is saved', async () => {
    const { app } = setup()
    const res = await call(app, ADMIN, 'GET', '/api/admin/bot')
    expect(res.status).toBe(200)
    expect(await data(res)).toEqual({
      config: DEFAULT_BOT_CONFIG,
      defaults: DEFAULT_BOT_CONFIG,
      isDefault: true,
    })
  })

  it('saves a valid config, keeps it, and resets to the defaults', async () => {
    const { app } = setup()
    const saved = await call(app, ADMIN, 'PUT', '/api/admin/bot', custom)
    expect(saved.status).toBe(200)
    expect(await data(saved)).toMatchObject({ config: custom, isDefault: false })
    expect((await data(await call(app, ADMIN, 'GET', '/api/admin/bot'))).config).toEqual(custom)

    const reset = await call(app, ADMIN, 'DELETE', '/api/admin/bot')
    expect(reset.status).toBe(200)
    expect(await data(reset)).toMatchObject({ config: DEFAULT_BOT_CONFIG, isDefault: true })
    expect((await data(await call(app, ADMIN, 'GET', '/api/admin/bot'))).config).toEqual(
      DEFAULT_BOT_CONFIG,
    )
  })

  it('refuses values out of bounds and keeps what was saved', async () => {
    const { app } = setup()
    await call(app, ADMIN, 'PUT', '/api/admin/bot', custom)
    for (const bad of [
      { ...custom, raceThinkMs: [500, 20000, 15000, 9000] },
      { ...custom, lostHint: [0.7, 1.5, 0.3] },
      { ...custom, proSample: 0 },
      { raceThinkMs: custom.raceThinkMs },
    ]) {
      const res = await call(app, ADMIN, 'PUT', '/api/admin/bot', bad)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ ok: false, error: { code: 'ERR_INPUT' } })
    }
    expect((await data(await call(app, ADMIN, 'GET', '/api/admin/bot'))).config).toEqual(custom)
  })

  it('falls back to the defaults when the stored value no longer validates', async () => {
    const { app, repo } = setup()
    await repo.settings.put('bot', { proSample: 'lots' })
    expect(await data(await call(app, ADMIN, 'GET', '/api/admin/bot'))).toMatchObject({
      config: DEFAULT_BOT_CONFIG,
      isDefault: true,
    })
  })
})

describe('bot rooms and the saved settings', () => {
  const body = { len: 4, zero: false, format: 'race', level: 2 }

  it('a new bot room gets the defaults, then what the admin saved', async () => {
    const { app, created } = setup()
    expect((await call(app, MEMBER, 'POST', '/api/bots', body)).status).toBe(201)
    await call(app, ADMIN, 'PUT', '/api/admin/bot', custom)
    expect((await call(app, MEMBER, 'POST', '/api/bots', body)).status).toBe(201)
    expect(created.map((o) => o.bot)).toEqual([DEFAULT_BOT_CONFIG, custom])
  })

  it('still creates the room with the defaults when the settings cannot be read', async () => {
    const repo = createMemoryRepo(clock)
    const broken: RepoHandle = {
      ...repo,
      settings: { ...repo.settings, get: () => Promise.reject(new Error('db down')) },
    }
    const { app, created } = setup(broken)
    expect((await call(app, MEMBER, 'POST', '/api/bots', body)).status).toBe(201)
    expect(created[0]?.bot).toEqual(DEFAULT_BOT_CONFIG)
  })
})
