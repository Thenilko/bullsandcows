import { env as workerEnv } from 'cloudflare:workers'
import { CHALLENGE_TTL_MS } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv } from '../../env'
import { createApp } from '../app'
import { fakeRooms } from './fakeRooms.testkit'

const START = Date.parse('2026-10-20T09:00:00Z')
const settings = { len: 4, zero: false, format: 'race' } as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = { ok: boolean; data?: any; error?: any }
const json = async (res: Response) => (await res.json()) as Body

function setup() {
  let now = START
  const clock = { now: () => now }
  const fake = fakeRooms()
  const repo = createMemoryRepo(clock)
  const app = createApp({
    env: parseEnv(workerEnv),
    repo,
    auth: createFakeAuth(clock),
    clock,
    rooms: fake.client,
  })
  const call = (user: string, method: string, path: string, body?: unknown, guest = false) =>
    app.request(path, {
      method,
      headers: {
        Authorization: `Bearer fake:${user}:p${guest ? ':guest' : ''}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  /** A member with a profile who has pinged (online) unless `online` is false. */
  async function member(name: string, online = true, guest = false): Promise<string> {
    const id = crypto.randomUUID()
    await repo.profiles.create({ id, username: name, email: null, isGuest: guest })
    if (online) await repo.profiles.touch(id, now, 'board')
    return id
  }
  const challenge = (from: string, to: string, extra = {}) =>
    call(from, 'POST', '/api/challenges', { to, ...settings, ...extra })
  return {
    app,
    repo,
    rooms: fake.rooms,
    call,
    member,
    challenge,
    advance: (ms: number) => {
      now += ms
    },
  }
}

describe('POST /api/challenges', () => {
  it('creates an invite room and the challenge for an online member', async () => {
    const ctx = setup()
    const a = await ctx.member('Ани')
    const b = await ctx.member('Боби')
    const res = await ctx.challenge(a, b)
    expect(res.status).toBe(201)
    const { data } = await json(res)
    expect(data.toUsername).toBe('Боби')
    expect(data.roomId).toBe(`room-invite:${data.code}`)
    expect(data.token).toMatch(/^tok-host-/)
    expect(data.url).toMatch(new RegExp(`/d/${data.code}$`))
    const row = await ctx.repo.challenges.get(data.challengeId)
    expect(row).toMatchObject({ fromId: a, toId: b, inviteCode: data.code, status: 'pending' })
    expect(row?.expiresAt).toBe(START + CHALLENGE_TTL_MS)
    expect([...ctx.rooms.values()][0]?.opts?.opponentKind).toBe('human')
  })

  it('refuses offline, unknown, guest and own targets', async () => {
    const ctx = setup()
    const a = await ctx.member('Ани')
    const off = await ctx.member('Офлайн', false)
    const guest = await ctx.member('guest-x', true, true)
    const offline = await ctx.challenge(a, off)
    expect(offline.status).toBe(409)
    expect((await json(offline)).error.code).toBe('ERR_OFFLINE')
    expect((await ctx.challenge(a, crypto.randomUUID())).status).toBe(404)
    expect((await ctx.challenge(a, guest)).status).toBe(404)
    const self = await ctx.challenge(a, a)
    expect(self.status).toBe(400)
    expect((await json(self)).error.code).toBe('ERR_INPUT')
    expect((await ctx.challenge(a, 'not-a-uuid')).status).toBe(400)
    expect(ctx.rooms.size).toBe(0)
  })

  it('counts a player seen more than three minutes ago as offline', async () => {
    const ctx = setup()
    const a = await ctx.member('Ани')
    const b = await ctx.member('Боби')
    ctx.advance(3 * 60_000 + 1)
    expect((await ctx.challenge(a, b)).status).toBe(409)
  })

  it('is for members only', async () => {
    const ctx = setup()
    const b = await ctx.member('Боби')
    const res = await ctx.call(
      crypto.randomUUID(),
      'POST',
      '/api/challenges',
      { to: b, ...settings },
      true,
    )
    expect(res.status).toBe(403)
    expect((await ctx.app.request('/api/challenges/incoming')).status).toBe(401)
  })

  it('replaces an open challenge to the same player', async () => {
    const ctx = setup()
    const a = await ctx.member('Ани')
    const b = await ctx.member('Боби')
    const first = (await json(await ctx.challenge(a, b))).data
    const second = (await json(await ctx.challenge(a, b, { format: 'classic' }))).data
    expect((await ctx.repo.challenges.get(first.challengeId))?.status).toBe('cancelled')
    const incoming = (await json(await ctx.call(b, 'GET', '/api/challenges/incoming'))).data
    expect(incoming.challenges.map((c: { id: string }) => c.id)).toEqual([second.challengeId])
  })
})

describe('incoming and status', () => {
  it('lists my pending challenges newest first with the sender, at most three', async () => {
    const ctx = setup()
    const b = await ctx.member('Боби')
    const senders = ['Ани', 'Вили', 'Гери', 'Деси']
    for (const name of senders) {
      const id = await ctx.member(name)
      expect((await ctx.challenge(id, b)).status).toBe(201)
      ctx.advance(1000)
    }
    const { data } = await json(await ctx.call(b, 'GET', '/api/challenges/incoming'))
    expect(data.challenges.map((c: { from: { username: string } }) => c.from.username)).toEqual([
      'Деси',
      'Гери',
      'Вили',
    ])
    expect(data.challenges[0]).toMatchObject({
      from: { username: 'Деси', level: 1, avatarSpecies: 'bull' },
      settings,
    })
    expect(Object.keys(data.challenges[0]).sort()).toEqual(['expiresAt', 'from', 'id', 'settings'])
  })

  it('reads an overdue pending challenge as expired and drops it from the inbox', async () => {
    const ctx = setup()
    const a = await ctx.member('Ани')
    const b = await ctx.member('Боби')
    const { data } = await json(await ctx.challenge(a, b))
    const path = `/api/challenges/${data.challengeId}`
    expect((await json(await ctx.call(a, 'GET', path))).data).toEqual({ status: 'pending' })
    ctx.advance(CHALLENGE_TTL_MS)
    expect((await json(await ctx.call(b, 'GET', path))).data).toEqual({ status: 'expired' })
    const incoming = (await json(await ctx.call(b, 'GET', '/api/challenges/incoming'))).data
    expect(incoming.challenges).toEqual([])
    const late = await ctx.call(b, 'POST', `${path}/accept`)
    expect(late.status).toBe(410)
  })

  it('shows the status only to the sender and the target', async () => {
    const ctx = setup()
    const a = await ctx.member('Ани')
    const b = await ctx.member('Боби')
    const c = await ctx.member('Цвети')
    const { data } = await json(await ctx.challenge(a, b))
    expect((await ctx.call(c, 'GET', `/api/challenges/${data.challengeId}`)).status).toBe(404)
    expect((await ctx.call(a, 'GET', `/api/challenges/${crypto.randomUUID()}`)).status).toBe(404)
    expect((await ctx.call(a, 'GET', '/api/challenges/nope')).status).toBe(404)
  })
})

describe('answers', () => {
  async function pending() {
    const ctx = setup()
    const a = await ctx.member('Ани')
    const b = await ctx.member('Боби')
    const { data } = await json(await ctx.challenge(a, b))
    return { ctx, a, b, id: data.challengeId as string, created: data }
  }

  it('accept joins the invite room and marks the challenge accepted', async () => {
    const { ctx, a, b, id, created } = await pending()
    expect((await ctx.call(a, 'POST', `/api/challenges/${id}/accept`)).status).toBe(404)
    const res = await ctx.call(b, 'POST', `/api/challenges/${id}/accept`)
    expect(res.status).toBe(200)
    expect((await json(res)).data).toEqual({ roomId: created.roomId, token: `tok-${b}` })
    expect((await json(await ctx.call(a, 'GET', `/api/challenges/${id}`))).data.status).toBe(
      'accepted',
    )
    const again = await ctx.call(b, 'POST', `/api/challenges/${id}/accept`)
    expect(again.status).toBe(409)
  })

  it('accept of a challenge whose room is gone marks it expired with 410', async () => {
    const { ctx, b, id } = await pending()
    const state = [...ctx.rooms.values()][0]
    if (state) state.status = 'expired'
    const res = await ctx.call(b, 'POST', `/api/challenges/${id}/accept`)
    expect(res.status).toBe(410)
    expect((await json(res)).error.code).toBe('ERR_INVITE_EXPIRED')
    expect((await ctx.repo.challenges.get(id))?.status).toBe('expired')
  })

  it('accept of a room someone else filled is ERR_ROOM_FULL and keeps the challenge', async () => {
    const { ctx, b, id } = await pending()
    const state = [...ctx.rooms.values()][0]
    if (state) state.joined.push({ ...state.host!, id: 'x' })
    const res = await ctx.call(b, 'POST', `/api/challenges/${id}/accept`)
    expect(res.status).toBe(409)
    expect((await json(res)).error.code).toBe('ERR_ROOM_FULL')
  })

  it('decline is for the target, cancel for the sender', async () => {
    const { ctx, a, b, id } = await pending()
    expect((await ctx.call(a, 'POST', `/api/challenges/${id}/decline`)).status).toBe(404)
    expect((await ctx.call(b, 'POST', `/api/challenges/${id}/cancel`)).status).toBe(404)
    const declined = await ctx.call(b, 'POST', `/api/challenges/${id}/decline`)
    expect(declined.status).toBe(200)
    expect((await json(await ctx.call(a, 'GET', `/api/challenges/${id}`))).data.status).toBe(
      'declined',
    )
    expect((await ctx.call(a, 'POST', `/api/challenges/${id}/cancel`)).status).toBe(409)
  })

  it('cancel by the sender ends the challenge for the target', async () => {
    const { ctx, a, b, id } = await pending()
    expect((await ctx.call(a, 'POST', `/api/challenges/${id}/cancel`)).status).toBe(200)
    expect(
      (await json(await ctx.call(b, 'GET', '/api/challenges/incoming'))).data.challenges,
    ).toEqual([])
    expect((await ctx.call(b, 'POST', `/api/challenges/${id}/accept`)).status).toBe(409)
  })
})

describe('„След играта“', () => {
  async function pending() {
    const ctx = setup()
    const a = await ctx.member('Ани')
    const b = await ctx.member('Боби')
    const { data } = await json(await ctx.challenge(a, b))
    return {
      ctx,
      a,
      b,
      id: data.challengeId as string,
      path: `/api/challenges/${data.challengeId}`,
    }
  }

  it('is for the target only', async () => {
    const { ctx, a, path } = await pending()
    const c = await ctx.member('Цвети')
    expect((await ctx.call(a, 'POST', `${path}/later`)).status).toBe(404)
    expect((await ctx.call(c, 'POST', `${path}/later`)).status).toBe(404)
    expect((await ctx.call(a, 'POST', `/api/challenges/${crypto.randomUUID()}/later`)).status).toBe(
      404,
    )
  })

  it('keeps the challenge pending, extends its expiry and tells the sender', async () => {
    const { ctx, a, b, id, path } = await pending()
    ctx.advance(8 * 60_000)
    const res = await ctx.call(b, 'POST', `${path}/later`)
    expect(res.status).toBe(200)
    expect((await json(res)).data).toEqual({ status: 'pending', later: true })
    const row = await ctx.repo.challenges.get(id)
    expect(row?.status).toBe('pending')
    expect(row?.laterAt).toBe(START + 8 * 60_000)
    expect(row?.expiresAt).toBe(START + 8 * 60_000 + CHALLENGE_TTL_MS)
    // Past the first ten minutes it is still open, for both sides.
    ctx.advance(5 * 60_000)
    expect((await json(await ctx.call(a, 'GET', path))).data).toEqual({
      status: 'pending',
      later: true,
    })
    const incoming = (await json(await ctx.call(b, 'GET', '/api/challenges/incoming'))).data
    expect(incoming.challenges).toHaveLength(1)
    expect(incoming.challenges[0]).toMatchObject({ id, later: true })
    // Accepting after the game still works.
    expect((await ctx.call(b, 'POST', `${path}/accept`)).status).toBe(200)
  })

  it('moves the expiry only once', async () => {
    const { ctx, b, id, path } = await pending()
    expect((await ctx.call(b, 'POST', `${path}/later`)).status).toBe(200)
    ctx.advance(5 * 60_000)
    expect((await ctx.call(b, 'POST', `${path}/later`)).status).toBe(200)
    expect((await ctx.repo.challenges.get(id))?.expiresAt).toBe(START + CHALLENGE_TTL_MS)
  })

  it('is refused once answered, cancelled or expired', async () => {
    const declined = await pending()
    await declined.ctx.call(declined.b, 'POST', `${declined.path}/decline`)
    const late = await declined.ctx.call(declined.b, 'POST', `${declined.path}/later`)
    expect(late.status).toBe(409)
    expect((await json(late)).error.code).toBe('ERR_FINISHED')

    const cancelled = await pending()
    await cancelled.ctx.call(cancelled.a, 'POST', `${cancelled.path}/cancel`)
    expect((await cancelled.ctx.call(cancelled.b, 'POST', `${cancelled.path}/later`)).status).toBe(
      409,
    )

    const expired = await pending()
    expired.ctx.advance(CHALLENGE_TTL_MS)
    const gone = await expired.ctx.call(expired.b, 'POST', `${expired.path}/later`)
    expect(gone.status).toBe(410)
    expect((await expired.ctx.repo.challenges.get(expired.id))?.status).toBe('expired')
  })

  it('the sender sees while pending that the target is playing', async () => {
    const { ctx, a, b, path } = await pending()
    await ctx.repo.profiles.touch(b, START, 'duel')
    expect((await json(await ctx.call(a, 'GET', path))).data).toEqual({
      status: 'pending',
      playing: true,
    })
    // Not once the target is out of the game, nor after an answer.
    await ctx.repo.profiles.touch(b, START, 'board')
    expect((await json(await ctx.call(a, 'GET', path))).data).toEqual({ status: 'pending' })
    await ctx.repo.profiles.touch(b, START, 'play')
    await ctx.call(b, 'POST', `${path}/decline`)
    expect((await json(await ctx.call(a, 'GET', path))).data).toEqual({ status: 'declined' })
  })
})

describe('leaderboard presence', () => {
  it('gives each row the user id and whether the player is online', async () => {
    const ctx = setup()
    const a = await ctx.member('Ани')
    const b = await ctx.member('Боби', false)
    for (const userId of [a, b]) {
      const g = await ctx.repo.games.create({
        userId,
        kind: 'free',
        len: 4,
        zero: false,
        secret: '1234',
        dailyDate: null,
        practice: false,
      })
      await ctx.repo.games.update(g.id, {
        startedAt: START,
        finishedAt: START + 1000,
        attempts: 5,
        won: true,
        score: 100,
      })
    }
    const asB = await ctx.call(b, 'GET', '/api/leaderboard?period=week&len=4&zero=false')
    const rows = (await json(asB)).data.rows as {
      username: string
      id?: string
      online: boolean
      playing?: boolean
    }[]
    expect(rows.find((r) => r.username === 'Ани')).toMatchObject({ id: a, online: true })
    // Only a row that can be challenged carries the user id: not an offline player, not me.
    const bobi = rows.find((r) => r.username === 'Боби')
    expect(bobi).toMatchObject({ online: false })
    expect(bobi?.id).toBeUndefined()
    const asA = await ctx.call(a, 'GET', '/api/leaderboard?period=week&len=4&zero=false')
    const mine = (
      (await json(asA)).data.rows as { you: boolean; id?: string; online: boolean }[]
    ).find((r) => r.you)
    expect(mine).toMatchObject({ online: true })
    expect(mine?.id).toBeUndefined()
    expect(bobi?.playing).toBeUndefined()
  })

  it('marks an online player in a game as playing, still with the id to challenge', async () => {
    const ctx = setup()
    const a = await ctx.member('Ани')
    const b = await ctx.member('Боби')
    for (const userId of [a, b]) {
      const g = await ctx.repo.games.create({
        userId,
        kind: 'free',
        len: 4,
        zero: false,
        secret: '1234',
        dailyDate: null,
        practice: false,
      })
      await ctx.repo.games.update(g.id, {
        startedAt: START,
        finishedAt: START + 1000,
        attempts: 5,
        won: true,
        score: 100,
      })
    }
    await ctx.repo.profiles.touch(a, START, 'play')
    const rowsOf = async (viewer: string) =>
      (await json(await ctx.call(viewer, 'GET', '/api/leaderboard?period=week&len=4&zero=false')))
        .data.rows as { username: string; id?: string; online: boolean; playing?: boolean }[]
    expect((await rowsOf(b)).find((r) => r.username === 'Ани')).toMatchObject({
      id: a,
      online: true,
      playing: true,
    })
    // Never on my own row.
    expect((await rowsOf(a)).find((r) => r.username === 'Ани')?.playing).toBeUndefined()
    // Offline: not playing, whatever the last ping had open.
    ctx.advance(3 * 60_000 + 1)
    expect((await rowsOf(b)).find((r) => r.username === 'Ани')?.playing).toBeUndefined()
  })
})
