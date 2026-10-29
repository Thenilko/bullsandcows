import { env as workerEnv } from 'cloudflare:workers'
import { AdminOverviewDto, MeDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv } from '../../env'
import type { NewGame } from '../../ports/repo'
import { createApp } from '../app'

const NOW = Date.parse('2026-10-20T09:00:00Z')
const DAY_MS = 86_400_000
let now = NOW
const clock = { now: () => now }

const ADMIN = 'fake:a1:Admin:admin'
const MEMBER = 'fake:m1:Mira'
const GUEST = 'fake:g1:g:guest'

function setup() {
  now = NOW
  const repo = createMemoryRepo(clock)
  const app = createApp({ env: parseEnv(workerEnv), repo, auth: createFakeAuth(clock), clock })
  return { app, repo }
}

const get = (app: ReturnType<typeof setup>['app'], token: string | null, path: string) =>
  app.request(path, token ? { headers: { Authorization: `Bearer ${token}` } } : {})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response) => (await res.json()) as { ok: boolean; data?: any; error?: any }

const game = (userId: string, over: Partial<NewGame> = {}): NewGame => ({
  userId,
  kind: 'free',
  len: 4,
  zero: false,
  secret: '1234',
  dailyDate: null,
  practice: false,
  ...over,
})

describe('admin overview route', () => {
  it('is closed to anonymous, guests and members', async () => {
    const { app } = setup()
    expect((await get(app, null, '/api/admin/overview')).status).toBe(401)
    for (const token of [GUEST, MEMBER]) {
      const res = await get(app, token, '/api/admin/overview')
      expect(res.status, token).toBe(403)
      expect(await json(res)).toEqual({ ok: false, error: { code: 'ERR_FORBIDDEN' } })
    }
  })

  it('counts users, games per kind and day, and lists the recently active', async () => {
    const { app, repo } = setup()
    now = NOW - 10 * DAY_MS
    await repo.profiles.create({ id: 'old', username: 'Old', email: 'old@x.bg', isGuest: false })
    await repo.games.create(game('old'))
    now = NOW - DAY_MS / 4
    await repo.profiles.create({ id: 'm1', username: 'Mira', email: 'm@x.bg', isGuest: false })
    await repo.profiles.create({ id: 'g1', username: 'guest-ab', email: null, isGuest: true })
    const won = await repo.games.create(game('m1', { kind: 'daily', dailyDate: '2026-10-19' }))
    await repo.games.update(won.id, { finishedAt: now, won: true, attempts: 5 })
    const lost = await repo.games.create(game('m1'))
    await repo.games.update(lost.id, { finishedAt: now, won: false, attempts: 9 })
    now += 60_000
    await repo.games.create(game('g1'))
    now = NOW

    const res = await get(app, ADMIN, '/api/admin/overview')
    expect(res.status).toBe(200)
    const data = AdminOverviewDto.parse((await json(res)).data)
    expect(data.generatedAt).toBe(NOW)
    expect(data.users).toEqual({
      total: 3,
      members: 2,
      guests: 1,
      new7d: 2,
      new30d: 3,
      active1d: 2,
      active7d: 2,
      active30d: 3,
    })
    expect(data.games).toEqual({ total: 4, finished: 2, won: 1 })
    expect(data.kinds).toEqual([
      { kind: 'free', total: 3, finished: 1, won: 0, winRate: 0, avgAttempts: null },
      { kind: 'daily', total: 1, finished: 1, won: 1, winRate: 100, avgAttempts: 5 },
    ])
    expect(data.days).toHaveLength(30)
    expect(data.days.at(-1)?.date).toBe('2026-10-20')
    expect(data.days.at(-1)).toEqual({
      date: '2026-10-20',
      newUsers: 2,
      activeUsers: 2,
      games: 3,
    })
    expect(data.days.find((d) => d.date === '2026-10-10')).toMatchObject({ newUsers: 1, games: 1 })
    expect(data.recentUsers.map((u) => [u.username, u.games, u.isGuest])).toEqual([
      ['guest-ab', 1, true],
      ['Mira', 2, false],
      ['Old', 1, false],
    ])
  })

  it('tells only the admin about the panel in /api/me', async () => {
    const { app } = setup()
    const admin = MeDto.parse((await json(await get(app, ADMIN, '/api/me'))).data)
    const member = MeDto.parse((await json(await get(app, MEMBER, '/api/me'))).data)
    expect(admin.isAdmin).toBe(true)
    expect('isAdmin' in member).toBe(false)
  })
})
