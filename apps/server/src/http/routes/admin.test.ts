import { env as workerEnv } from 'cloudflare:workers'
import { AdminGameDetailDto, AdminGamesDto, AdminOnlineDto, AdminOverviewDto, AdminUsersPageDto, MeDto } from '@bc/protocol'
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
    const people = AdminUsersPageDto.parse((await json(await get(app, ADMIN, '/api/admin/users'))).data)
    expect(people.users.map((u) => [u.username, u.games, u.isGuest])).toEqual([
      ['guest-ab', 1, true],
      ['Mira', 2, false],
      ['Old', 1, false],
    ])
    expect([people.total, people.offset, people.pageSize]).toEqual([3, 0, 25])
  })

  it('tells only the admin about the panel in /api/me', async () => {
    const { app } = setup()
    const admin = MeDto.parse((await json(await get(app, ADMIN, '/api/me'))).data)
    const member = MeDto.parse((await json(await get(app, MEMBER, '/api/me'))).data)
    expect(admin.isAdmin).toBe(true)
    expect('isAdmin' in member).toBe(false)
  })
})

describe('admin games routes', () => {
  async function seed() {
    const ctx = setup()
    const { repo } = ctx
    await repo.profiles.create({ id: 'm1', username: 'Mira', email: 'm@x.bg', isGuest: false })
    await repo.profiles.create({ id: 'p2', username: 'Pesho', email: 'p@x.bg', isGuest: false })
    now = NOW - 60_000
    const solo = await repo.games.create(game('m1', { secret: '5678' }))
    await repo.games.addGuess({ gameId: solo.id, guess: '1234', bulls: 0, cows: 0, consistent: true, at: now })
    await repo.games.addGuess({ gameId: solo.id, guess: '5687', bulls: 2, cows: 2, consistent: true, at: now + 1 })
    now = NOW
    const a = await repo.games.create(game('m1', { kind: 'duel_classic', secret: '9012' }))
    now += 1
    const b = await repo.games.create(game('p2', { kind: 'duel_classic', secret: '3456' }))
    await repo.games.addGuess({ gameId: b.id, guess: '3456', bulls: 4, cows: 0, consistent: true, at: now })
    await repo.duels.create({
      format: 'classic',
      len: 4,
      zero: false,
      opponentKind: 'friend',
      botLevel: null,
      inviteCode: 'ABC12',
      playerA: 'm1',
      playerB: 'p2',
      gameA: a.id,
      gameB: b.id,
    })
    return { ...ctx, solo, a, b }
  }

  it('is closed to everyone but the admin', async () => {
    const { app, solo } = await seed()
    for (const path of ['/api/admin/games', `/api/admin/games/${solo.id}`]) {
      expect((await get(app, null, path)).status).toBe(401)
      expect((await get(app, MEMBER, path)).status).toBe(403)
    }
  })

  it('lists every game newest first with the secret and who it was against', async () => {
    const { app } = await seed()
    const data = AdminGamesDto.parse((await json(await get(app, ADMIN, '/api/admin/games'))).data)
    expect(data.nextOffset).toBeNull()
    expect(data.games.map((g) => [g.player.username, g.kind, g.secret, g.duel?.opponent?.username ?? null])).toEqual([
      ['Pesho', 'duel_classic', '3456', 'Mira'],
      ['Mira', 'duel_classic', '9012', 'Pesho'],
      ['Mira', 'free', '5678', null],
    ])
    const mine = AdminGamesDto.parse((await json(await get(app, ADMIN, '/api/admin/games?user=p2'))).data)
    expect(mine.games.map((g) => g.player.username)).toEqual(['Pesho'])
    expect((await get(app, ADMIN, '/api/admin/games?offset=-1')).status).toBe(400)
  })

  it('pages by 50', async () => {
    const { app, repo } = setup()
    await repo.profiles.create({ id: 'm1', username: 'Mira', email: null, isGuest: false })
    for (let i = 0; i < 51; i += 1) {
      now = NOW + i
      await repo.games.create(game('m1'))
    }
    const first = AdminGamesDto.parse((await json(await get(app, ADMIN, '/api/admin/games'))).data)
    expect([first.games.length, first.nextOffset]).toEqual([50, 50])
    const second = AdminGamesDto.parse((await json(await get(app, ADMIN, '/api/admin/games?offset=50'))).data)
    expect([second.games.length, second.nextOffset]).toEqual([1, null])
  })

  it('shows a game with every guess, and both sides of a duel', async () => {
    const { app, solo, a } = await seed()
    const one = AdminGameDetailDto.parse((await json(await get(app, ADMIN, `/api/admin/games/${solo.id}`))).data)
    expect(one.side.guesses.map((g) => [g.guess, g.bulls, g.cows])).toEqual([
      ['1234', 0, 0],
      ['5687', 2, 2],
    ])
    expect(one.opponent).toBeNull()

    const duel = AdminGameDetailDto.parse((await json(await get(app, ADMIN, `/api/admin/games/${a.id}`))).data)
    expect(duel.side.game.player.username).toBe('Mira')
    expect(duel.opponent?.game.player.username).toBe('Pesho')
    expect(duel.opponent?.guesses.map((g) => g.guess)).toEqual(['3456'])
    expect((await get(app, ADMIN, '/api/admin/games/nope')).status).toBe(404)
  })
})

describe('online now', () => {
  const ping = (app: ReturnType<typeof setup>['app'], token: string, activity: unknown) =>
    app.request('/api/me/ping', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity }),
    })

  it('lists who pinged in the last 3 minutes with what they have open and their unfinished game', async () => {
    const { app, repo } = setup()
    await repo.profiles.create({ id: 'm1', username: 'Mira', email: 'm@x.bg', isGuest: false })
    await repo.profiles.create({ id: 'g1', username: 'guest-ab', email: null, isGuest: true })
    await repo.profiles.create({ id: 'old', username: 'Old', email: null, isGuest: false })
    now = NOW - 4 * 60_000
    expect((await ping(app, 'fake:old:Old', 'home')).status).toBe(200)
    now = NOW - 2 * 60_000
    const playing = await repo.games.create(game('m1', { kind: 'daily', dailyDate: '2026-10-20', secret: '4321' }))
    await repo.games.addGuess({ gameId: playing.id, guess: '1234', bulls: 0, cows: 4, consistent: true, at: now })
    await repo.games.update(playing.id, { attempts: 1 })
    expect((await ping(app, 'fake:m1:Mira', 'play')).status).toBe(200)
    now = NOW - 60_000
    expect((await ping(app, 'fake:g1:g:guest', 'queue')).status).toBe(200)
    now = NOW

    const data = AdminOnlineDto.parse((await json(await get(app, ADMIN, '/api/admin/online'))).data)
    expect(data.windowMinutes).toBe(3)
    expect(data.players.map((p) => [p.username, p.activity, p.isGuest, p.game?.secret ?? null, p.game?.attempts ?? null])).toEqual([
      ['guest-ab', 'queue', true, null, null],
      ['Mira', 'play', false, '4321', 1],
    ])
    // A ping counts as activity: Old pinged after Mira's last game, so Old leads the list.
    const people = AdminUsersPageDto.parse((await json(await get(app, ADMIN, '/api/admin/users'))).data)
    expect(people.users.map((u) => u.username)).toEqual(['guest-ab', 'Mira', 'Old'])
    expect(people.users[0]?.lastSeenAt).toBe(NOW - 60_000)
  })

  it('refuses an unknown activity and keeps the list for the admin', async () => {
    const { app } = setup()
    expect((await ping(app, MEMBER, 'hacking')).status).toBe(400)
    expect((await get(app, MEMBER, '/api/admin/online')).status).toBe(403)
  })
})
