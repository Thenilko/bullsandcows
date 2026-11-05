import { env as workerEnv } from 'cloudflare:workers'
import { BoardDto, LeaderboardDto } from '@bc/protocol'
import { describe, expect, it } from 'vitest'
import { createFakeAuth } from '../../adapters/auth/fake'
import { createMemoryRepo } from '../../adapters/repo/memory'
import { parseEnv } from '../../env'
import type { GameKind } from '../../ports/repo'
import { periodStart } from '../../stats/boards'
import { createApp } from '../app'

// Thursday 5 November 2026, 12:00 in Sofia.
const NOW = Date.parse('2026-11-05T10:00:00Z')
const clock = { now: () => NOW }

function setup() {
  const repo = createMemoryRepo(clock)
  const app = createApp({ env: parseEnv(workerEnv), repo, auth: createFakeAuth(clock), clock })
  const member = async (id: string, guest = false) => {
    await repo.profiles.create({ id, username: id.toUpperCase(), email: null, isGuest: guest })
    return id
  }
  const duel = async (a: string, b: string | null, winner: string | null, bot = false) => {
    const d = await repo.duels.create({
      format: 'classic',
      len: 4,
      zero: false,
      opponentKind: bot ? 'bot' : 'friend',
      botLevel: bot ? 2 : null,
      inviteCode: null,
      playerA: a,
      playerB: b,
      gameA: null,
      gameB: null,
    })
    await repo.duels.finish(d.id, {
      winner,
      outcome: 'solved',
      ratingDeltaA: null,
      ratingDeltaB: null,
      finishedAt: NOW,
    })
  }
  const game = async (userId: string, kind: GameKind, finishedAt: number) => {
    const g = await repo.games.create({
      userId,
      kind,
      len: 4,
      zero: false,
      secret: '1234',
      dailyDate: null,
      practice: false,
    })
    await repo.games.update(g.id, { finishedAt, won: true, attempts: 5, score: 10 })
  }
  const get = async (user: string, path: string, guest = false) => {
    const res = await app.request(path, {
      headers: {
        Authorization: `Bearer fake:${user}:${user.toUpperCase()}${guest ? ':guest' : ''}`,
      },
    })
    return {
      status: res.status,
      body: (await res.json()) as { ok: boolean; data?: unknown; error?: unknown },
    }
  }
  const board = async (user: string, path: string) => {
    const res = await get(user, path)
    expect(res.status, path).toBe(200)
    return BoardDto.parse(res.body.data)
  }
  return { repo, member, duel, game, get, board }
}

const rowsOf = (b: BoardDto) => b.rows.map((r) => [r.rank, r.username, r.value, r.you])

describe('GET /api/leaderboard/:kind', () => {
  it('refuses guests, unknown kinds and bad periods', async () => {
    const ctx = setup()
    for (const kind of ['duels', 'streaks', 'herders', 'games', 'friends']) {
      const res = await ctx.get('g1', `/api/leaderboard/${kind}`, true)
      expect(res.status, kind).toBe(403)
      expect(res.body).toEqual({ ok: false, error: { code: 'ERR_GUEST' } })
    }
    expect((await ctx.get('u1', '/api/leaderboard/points')).status).toBe(400)
    expect((await ctx.get('u1', '/api/leaderboard/games?period=all')).status).toBe(400)
  })

  it('keeps „Точки“ at /api/leaderboard as it was', async () => {
    const ctx = setup()
    await ctx.member('u1')
    const res = await ctx.get('u1', '/api/leaderboard?period=all&len=4&zero=false')
    expect(LeaderboardDto.parse(res.body.data)).toEqual({ rows: [], me: null })
  })

  it('duels: rating order with W–L, my place, the challenge id only for online others', async () => {
    const ctx = setup()
    const [a, b] = [await ctx.member('ana'), await ctx.member('bobi')]
    const g = await ctx.member('gost', true)
    await ctx.repo.profiles.setRating(a, { rating: 1612.4, rd: 80, vol: 0.06 })
    await ctx.duel(a, b, a)
    await ctx.duel(b, g, b)
    await ctx.repo.profiles.touch(a, NOW, 'board')
    const res = await ctx.board(b, '/api/leaderboard/duels')
    expect(res.kind).toBe('duels')
    expect(rowsOf(res)).toEqual([
      [1, 'ANA', 1612, false],
      [2, 'BOBI', 1500, true],
    ])
    expect(res.rows.map((r) => [r.wins, r.losses])).toEqual([
      [1, 0],
      [1, 1],
    ])
    expect(res.rows[0]).toMatchObject({ online: true, id: a })
    expect(res.rows[0]?.playing).toBeUndefined()
    expect(res.rows[1]?.id).toBeUndefined()
    expect(res.me).toEqual({ rank: 2, value: 1500 })
    // In a duel right now: „играе“, and still challengeable.
    await ctx.repo.profiles.touch(a, NOW, 'duel')
    const busy = await ctx.board(b, '/api/leaderboard/duels')
    expect(busy.rows[0]).toMatchObject({ online: true, id: a, playing: true })
    expect(JSON.stringify(res)).not.toContain('GOST')
  })

  it('streaks: a streak whose last win is older than yesterday is not counted', async () => {
    const ctx = setup()
    for (const id of ['a', 'b', 'c']) await ctx.member(id)
    await ctx.repo.profiles.setStreak('a', {
      currentStreak: 2,
      bestStreak: 7,
      streakDate: '2026-11-04',
    })
    await ctx.repo.profiles.setStreak('b', {
      currentStreak: 2,
      bestStreak: 2,
      streakDate: '2026-11-05',
    })
    await ctx.repo.profiles.setStreak('c', {
      currentStreak: 9,
      bestStreak: 9,
      streakDate: '2026-11-03',
    })
    const res = await ctx.board('c', '/api/leaderboard/streaks')
    expect(res.rows.map((r) => [r.username, r.value, r.best])).toEqual([
      ['A', 2, 7],
      ['B', 2, 2],
    ])
    expect(res.me).toBeNull()
  })

  it('herders: xp with the level and title', async () => {
    const ctx = setup()
    await ctx.member('a')
    await ctx.member('b')
    await ctx.repo.profiles.addXp('a', 5000)
    await ctx.repo.profiles.addXp('b', 10)
    const res = await ctx.board('b', '/api/leaderboard/herders')
    expect(rowsOf(res)).toEqual([
      [1, 'A', 5000, false],
      [2, 'B', 10, true],
    ])
    expect(res.rows[0]?.level).toBeGreaterThan(res.rows[1]?.level ?? 0)
    expect(res.rows[0]?.rankKey).not.toBe('calf')
  })

  it('games: today, this week and this month in Sofia time', async () => {
    const ctx = setup()
    await ctx.member('a')
    await ctx.member('b')
    const today = periodStart('today', NOW)
    expect(today).toBe(Date.parse('2026-11-04T22:00:00Z'))
    expect(periodStart('week', NOW)).toBe(Date.parse('2026-11-01T22:00:00Z'))
    expect(periodStart('month', NOW)).toBe(Date.parse('2026-10-31T22:00:00Z'))
    await ctx.game('a', 'daily', today + 1000)
    await ctx.game('a', 'duel_classic', today + 2000)
    await ctx.game('b', 'free', today + 500)
    await ctx.game('b', 'free', today - 1000) // Wednesday: this week
    await ctx.game('b', 'free', Date.parse('2026-11-01T12:00:00Z')) // Sunday: this month only
    const rows = async (period: string) =>
      (await ctx.board('a', `/api/leaderboard/games?period=${period}`)).rows.map((r) => [
        r.username,
        r.value,
      ])
    expect(await rows('today')).toEqual([
      ['A', 2],
      ['B', 1],
    ])
    // A tie: whoever reached the count first (B's last game is earlier).
    expect(await rows('week')).toEqual([
      ['B', 2],
      ['A', 2],
    ])
    expect(await rows('month')).toEqual([
      ['B', 3],
      ['A', 2],
    ])
  })

  it('friends: only human duel opponents, with my head-to-head record', async () => {
    const ctx = setup()
    for (const id of ['me', 'f', 'x']) await ctx.member(id)
    await ctx.member('g', true)
    await ctx.repo.profiles.addXp('f', 300)
    await ctx.duel('me', 'f', 'me')
    await ctx.duel('f', 'me', 'f')
    await ctx.duel('f', 'me', null)
    await ctx.duel('me', 'g', 'me')
    await ctx.duel('me', null, 'me', true)
    await ctx.duel('f', 'x', 'x')
    const res = await ctx.board('me', '/api/leaderboard/friends')
    expect(rowsOf(res)).toEqual([
      [1, 'F', 300, false],
      [2, 'ME', 0, true],
    ])
    expect(res.rows[0]).toMatchObject({ wins: 1, losses: 1, draws: 1 })
    expect(res.rows[1]?.wins).toBeUndefined()
    const alone = await ctx.board('x', '/api/leaderboard/friends')
    expect(alone.rows.map((r) => r.username)).toEqual(['F', 'X'])
    await ctx.member('new')
    expect(rowsOf(await ctx.board('new', '/api/leaderboard/friends'))).toEqual([
      [1, 'NEW', 0, true],
    ])
  })
})
