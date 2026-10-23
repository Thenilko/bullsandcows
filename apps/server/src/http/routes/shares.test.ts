import { env as workerEnv } from 'cloudflare:workers'
import { ShareResultDto } from '@bc/protocol'
import { describe, expect, it, vi } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv } from '../../env'
import type { Repo } from '../../ports/repo'
import { createApp } from '../app'

const NOW = Date.parse('2026-10-22T09:00:00Z')
const clock = { now: () => NOW }

function setup() {
  const repo = createMemoryRepo(clock)
  const app = createApp({ env: parseEnv(workerEnv), repo, auth: createFakeAuth(clock), clock })
  return { app, repo }
}

type App = ReturnType<typeof setup>['app']

const req = (app: App, token: string | null, method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response) => (await res.json()) as { ok: boolean; data?: any; error?: any }

let seq = 0
/** Unique users per test: the rate limiter store is shared by the isolate. */
const member = () => {
  seq += 1
  return `sh-user-${seq}-${crypto.randomUUID().slice(0, 8)}`
}

async function finishedGame(repo: Repo, userId: string): Promise<string> {
  const game = await repo.games.create({
    userId,
    kind: 'free',
    len: 4,
    zero: false,
    secret: '1234',
    dailyDate: null,
    practice: false,
  })
  await repo.games.update(game.id, {
    startedAt: NOW - 30_000,
    finishedAt: NOW,
    won: true,
    attempts: 3,
  })
  return game.id
}

describe('POST /api/shares', () => {
  it('records one share per game for a member and moves the teller badge', async () => {
    const { app, repo } = setup()
    const me = member()
    await repo.profiles.create({ id: me, username: me, email: null, isGuest: false })
    const ids = await Promise.all(Array.from({ length: 5 }, () => finishedGame(repo, me)))
    for (const [i, gameId] of ids.entries()) {
      const res = await req(app, `fake:${me}:${me}`, 'POST', '/api/shares', {
        gameId,
        channel: 'copy',
      })
      expect(res.status).toBe(200)
      const data = ShareResultDto.parse((await json(res)).data)
      expect(data.counted).toBe(true)
      expect(data.newBadges).toEqual(i === ids.length - 1 ? [{ key: 'teller', tier: 1 }] : [])
    }
    expect(await repo.shares.countOf(me)).toBe(5)
    expect((await repo.profiles.get(me))?.xp).toBe(50)
    const again = await req(app, `fake:${me}:${me}`, 'POST', '/api/shares', {
      gameId: ids[0],
      channel: 'native',
    })
    expect(await json(again)).toEqual({ ok: true, data: { counted: false } })
    expect(await repo.shares.countOf(me)).toBe(5)
  })

  it('accepts and ignores guests, and refuses games that are not the caller’s finished ones', async () => {
    const { app, repo } = setup()
    const me = member()
    const other = member()
    await repo.profiles.create({ id: me, username: me, email: null, isGuest: false })
    const mine = await finishedGame(repo, me)
    const theirs = await finishedGame(repo, other)
    const open = await repo.games.create({
      userId: me,
      kind: 'free',
      len: 4,
      zero: false,
      secret: '1234',
      dailyDate: null,
      practice: false,
    })
    const guest = `fake:${member()}:g:guest`
    const asGuest = await req(app, guest, 'POST', '/api/shares', { gameId: mine, channel: 'image' })
    expect(await json(asGuest)).toEqual({ ok: true, data: { counted: false } })
    for (const gameId of [theirs, open.id, crypto.randomUUID()]) {
      const res = await req(app, `fake:${me}:${me}`, 'POST', '/api/shares', {
        gameId,
        channel: 'copy',
      })
      expect(res.status, gameId).toBe(404)
    }
    expect(await repo.shares.countOf(me)).toBe(0)
  })

  it('validates the body and requires a user', async () => {
    const { app, repo } = setup()
    const me = member()
    const mine = await finishedGame(repo, me)
    for (const body of [
      { gameId: mine },
      { gameId: 'x', channel: 'copy' },
      { gameId: mine, channel: 'sms' },
    ]) {
      const res = await req(app, `fake:${me}:${me}`, 'POST', '/api/shares', body)
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
    expect(
      (await req(app, null, 'POST', '/api/shares', { gameId: mine, channel: 'copy' })).status,
    ).toBe(401)
  })
})

describe('POST /api/shares/landing', () => {
  it('logs one line and needs no user', async () => {
    const { app } = setup()
    const logged = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const res = await req(app, null, 'POST', '/api/shares/landing')
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ ok: true, data: { logged: true } })
    expect(logged).toHaveBeenCalledWith('share landing')
    logged.mockRestore()
  })
})
