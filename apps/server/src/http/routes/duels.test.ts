import { env as workerEnv } from 'cloudflare:workers'
import { isInviteCode } from '@bc/game-core'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import {
  RoomError,
  type PlayerInfo,
  type Room,
  type RoomClient,
  type RoomInfo,
  type RoomOpts,
} from '../../duel/roomClient'
import { parseEnv, type Env } from '../../env'
import { createApp } from '../app'

const clock = { now: () => Date.parse('2026-10-20T09:00:00Z') }

interface FakeState {
  opts?: RoomOpts
  host?: PlayerInfo
  inviteCode?: string
  joined: PlayerInfo[]
  status: RoomInfo['status']
}

/** In-memory rooms: invite rooms by code, fresh rooms by counter. */
function fakeRooms() {
  const rooms = new Map<string, FakeState>()
  let seq = 0
  const make = (key: string): Room => ({
    id: `room-${key}`,
    async create({ opts, host, inviteCode }) {
      rooms.set(key, { opts, host, inviteCode, joined: [], status: 'waiting' })
      return { token: `tok-host-${key}` }
    },
    async join({ info }) {
      const r = rooms.get(key)
      if (!r) throw new RoomError('ERR_NOT_FOUND')
      if (r.status === 'expired') throw new RoomError('ERR_INVITE_EXPIRED')
      if (r.joined.length >= 1) throw new RoomError('ERR_ROOM_FULL')
      r.joined.push(info)
      r.status = 'started'
      return { token: `tok-${info.id}` }
    },
    async info() {
      const r = rooms.get(key)
      if (!r?.opts || !r.host) return null
      const { format, len, zero } = r.opts
      return {
        status: r.status,
        host: { id: r.host.id, username: r.host.username, level: r.host.level },
        settings: { format, len, zero },
        players: 1 + r.joined.length,
      }
    },
  })
  const client: RoomClient = {
    invite: (code) => make(`invite:${code}`),
    fresh: () => make(`fresh:${(seq += 1)}`),
  }
  return { client, rooms }
}

let seq = 0
const newUser = () => {
  seq += 1
  return `du-${seq}-${crypto.randomUUID().slice(0, 8)}`
}

function setup(over: Partial<Env> = {}) {
  const fake = fakeRooms()
  const app = createApp({
    env: { ...parseEnv(workerEnv), ...over },
    repo: createMemoryRepo(clock),
    auth: createFakeAuth(clock),
    clock,
    rooms: fake.client,
  })
  return { app, ...fake }
}

const call = (
  app: ReturnType<typeof setup>['app'],
  user: string,
  method: string,
  path: string,
  body?: unknown,
  guest = false,
  extra: Record<string, string> = {},
) =>
  app.request(path, {
    method,
    headers: {
      Authorization: `Bearer fake:${user}:${user}${guest ? ':guest' : ''}`,
      'Content-Type': 'application/json',
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response) => (await res.json()) as { ok: boolean; data?: any; error?: any }
const settings = { len: 4, zero: false, format: 'race' } as const

async function createInvite(ctx: ReturnType<typeof setup>, host: string, guest = false) {
  const res = await call(ctx.app, host, 'POST', '/api/duels/invites', settings, guest)
  return { res, body: await json(res) }
}

describe('invites', () => {
  it('creates an invite with a valid code, link and host token', async () => {
    const ctx = setup()
    const { res, body } = await createInvite(ctx, newUser())
    expect(res.status).toBe(201)
    expect(isInviteCode(body.data.code)).toBe(true)
    expect(body.data.url).toBe(`${parseEnv(workerEnv).APP_ORIGIN}/d/${body.data.code}`)
    expect(body.data.roomId).toBe(`room-invite:${body.data.code}`)
    expect(body.data.token).toMatch(/^tok-host-/)
    expect([...ctx.rooms.values()][0]?.opts?.opponentKind).toBe('human')
    expect([...ctx.rooms.values()][0]?.inviteCode).toBe(body.data.code)
  })

  it('rejects bad settings with ERR_INPUT and no auth with 401', async () => {
    const ctx = setup()
    const bad = await call(ctx.app, newUser(), 'POST', '/api/duels/invites', { len: 9 })
    expect(bad.status).toBe(400)
    const anon = await ctx.app.request('/api/duels/invites', { method: 'POST' })
    expect(anon.status).toBe(401)
  })

  it('shows the invite without the host id', async () => {
    const ctx = setup()
    const { body } = await createInvite(ctx, newUser())
    const res = await call(ctx.app, newUser(), 'GET', `/api/duels/invites/${body.data.code}`)
    expect(res.status).toBe(200)
    const info = await json(res)
    expect(info.data.status).toBe('waiting')
    expect(info.data.settings).toEqual(settings)
    expect(info.data.host.id).toBeUndefined()
    expect(Object.keys(info.data.host).sort()).toEqual(['avatarSpecies', 'level', 'username'])
    expect(info.data.host.avatarSpecies).toBe('bull')
  })

  it('answers 404 for an unknown or malformed code', async () => {
    const ctx = setup()
    expect((await call(ctx.app, newUser(), 'GET', '/api/duels/invites/ABCDE')).status).toBe(404)
    expect((await call(ctx.app, newUser(), 'GET', '/api/duels/invites/abc')).status).toBe(404)
    expect((await call(ctx.app, newUser(), 'POST', '/api/duels/invites/!!!!!/join')).status).toBe(
      404,
    )
  })

  it('lets a second user join and refuses a third', async () => {
    const ctx = setup()
    const { body } = await createInvite(ctx, newUser())
    const path = `/api/duels/invites/${body.data.code}/join`
    const second = newUser()
    const joined = await call(ctx.app, second, 'POST', path)
    expect(joined.status).toBe(200)
    const data = (await json(joined)).data
    expect(data.roomId).toBe(body.data.roomId)
    expect(data.token).toBe(`tok-${second}`)
    const third = await call(ctx.app, newUser(), 'POST', path)
    expect(third.status).toBe(409)
    expect((await json(third)).error.code).toBe('ERR_ROOM_FULL')
  })

  it('maps an expired room to 410 on both GET and join', async () => {
    const ctx = setup()
    const { body } = await createInvite(ctx, newUser())
    const state = [...ctx.rooms.values()][0]
    if (state) state.status = 'expired'
    const get = await call(ctx.app, newUser(), 'GET', `/api/duels/invites/${body.data.code}`)
    expect(get.status).toBe(410)
    expect((await json(get)).error.code).toBe('ERR_INVITE_EXPIRED')
    const join = await call(ctx.app, newUser(), 'POST', `/api/duels/invites/${body.data.code}/join`)
    expect(join.status).toBe(410)
  })

  it('refuses the host joining their own invite', async () => {
    const ctx = setup()
    const host = newUser()
    const { body } = await createInvite(ctx, host)
    const res = await call(ctx.app, host, 'POST', `/api/duels/invites/${body.data.code}/join`)
    expect(res.status).toBe(400)
    expect((await json(res)).error.code).toBe('ERR_INPUT')
  })

  it('lets guests create and accept invites', async () => {
    const ctx = setup()
    const { res, body } = await createInvite(ctx, newUser(), true)
    expect(res.status).toBe(201)
    const join = await call(
      ctx.app,
      newUser(),
      'POST',
      `/api/duels/invites/${body.data.code}/join`,
      undefined,
      true,
    )
    expect(join.status).toBe(200)
    expect([...ctx.rooms.values()][0]?.joined[0]?.isGuest).toBe(true)
  })

  it('retries the code while a live room holds it', async () => {
    const ctx = setup()
    let calls = 0
    const live = ctx.client.invite
    const client: RoomClient = {
      fresh: ctx.client.fresh,
      invite: (code) => {
        const room = live(code)
        calls += 1
        if (calls > 2) return room
        return {
          ...room,
          info: async () => ({
            status: 'waiting',
            host: { id: 'x', username: 'x', level: 1 },
            settings,
            players: 1,
          }),
        }
      },
    }
    const app = createApp({
      env: parseEnv(workerEnv),
      repo: createMemoryRepo(clock),
      auth: createFakeAuth(clock),
      clock,
      rooms: client,
    })
    const res = await call(app, newUser(), 'POST', '/api/duels/invites', settings)
    expect(res.status).toBe(201)
    expect(calls).toBeGreaterThanOrEqual(3)
  })

  it('rate limits invite creation to 20 per minute per user', async () => {
    const ctx = setup()
    const user = newUser()
    for (let i = 0; i < 20; i += 1) {
      expect((await createInvite(ctx, user)).res.status).toBe(201)
    }
    expect((await createInvite(ctx, user)).res.status).toBe(429)
  })
})

describe('bot rooms', () => {
  it('creates a bot room on a fresh id for a guest too', async () => {
    const ctx = setup()
    const res = await call(ctx.app, newUser(), 'POST', '/api/bots', { ...settings, level: 3 }, true)
    expect(res.status).toBe(201)
    const data = (await json(res)).data
    expect(data.roomId).toMatch(/^room-fresh:/)
    expect(data.token).toMatch(/^tok-host-/)
    const state = [...ctx.rooms.values()][0]
    expect(state?.opts).toMatchObject({ opponentKind: 'bot', botLevel: 3 })
  })

  it('rejects an invalid bot level', async () => {
    const ctx = setup()
    const res = await call(ctx.app, newUser(), 'POST', '/api/bots', { ...settings, level: 5 })
    expect(res.status).toBe(400)
  })
})

describe('test secret hook', () => {
  const TEST = { 'x-test-secret': '1234' }
  const bot = { ...settings, level: 1 }
  const created = (ctx: ReturnType<typeof setup>) => [...ctx.rooms.values()][0]?.opts

  it('passes x-test-secret to the room in test and dev, without echoing it', async () => {
    for (const ENVIRONMENT of ['test', 'dev'] as const) {
      const invite = setup({ ENVIRONMENT })
      const res = await call(
        invite.app,
        newUser(),
        'POST',
        '/api/duels/invites',
        settings,
        false,
        TEST,
      )
      expect(res.status).toBe(201)
      expect(created(invite)?.testSecret).toBe('1234')
      expect(JSON.stringify(await json(res))).not.toContain('1234')

      const bots = setup({ ENVIRONMENT })
      const botRes = await call(bots.app, newUser(), 'POST', '/api/bots', bot, true, TEST)
      expect(botRes.status).toBe(201)
      expect(created(bots)?.testSecret).toBe('1234')
    }
  })

  it('never reads the header in production or preview', async () => {
    for (const ENVIRONMENT of ['production', 'preview'] as const) {
      const invite = setup({ ENVIRONMENT })
      await call(invite.app, newUser(), 'POST', '/api/duels/invites', settings, false, TEST)
      expect(created(invite)).toBeDefined()
      expect(created(invite)?.testSecret).toBeUndefined()
      const bots = setup({ ENVIRONMENT })
      await call(bots.app, newUser(), 'POST', '/api/bots', bot, false, TEST)
      expect(created(bots)?.testSecret).toBeUndefined()
    }
  })

  it('omits the field without the header and rejects an invalid code', async () => {
    const plain = setup()
    await createInvite(plain, newUser())
    expect(created(plain) && 'testSecret' in created(plain)!).toBe(false)
    const bad = setup()
    const res = await call(bad.app, newUser(), 'POST', '/api/bots', bot, false, {
      'x-test-secret': '1123',
    })
    expect(res.status).toBe(400)
    expect((await json(res)).error.code).toBe('ERR_CODE')
    expect(bad.rooms.size).toBe(0)
  })
})
