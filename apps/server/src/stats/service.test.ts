import { FALLBACK_HISTOGRAM, levelFromXp, MIN_SAMPLE, rankKeyForLevel, sofiaDate } from '@bc/game-core'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRepo } from '../adapters/repo/memory'
import type { AuthUser } from '../ports/auth'
import type { GamePatch, NewGame, PublicGameRow, Repo } from '../ports/repo'
import { DistributionCache, StatsService } from './service'

const START = Date.parse('2026-10-20T09:00:00Z')
const DATE = sofiaDate(new Date(START))
const DAY_MS = 86_400_000

let now = START
const clock = { now: () => now }
let repo: Repo
let stats: StatsService

const mira: AuthUser = { id: 'mira', isGuest: false }
const rada: AuthUser = { id: 'rada', isGuest: false }
const ivo: AuthUser = { id: 'ivo', isGuest: false }
const guest: AuthUser = { id: 'guest', isGuest: true }

beforeEach(async () => {
  now = START
  repo = createMemoryRepo(clock)
  stats = new StatsService({ repo, clock, cache: new DistributionCache() })
  for (const [u, name] of [
    [mira, 'Mira'],
    [rada, 'Rada'],
    [ivo, 'Ivo'],
  ] as const) {
    await repo.profiles.create({ id: u.id, username: name, email: `${u.id}@x.bg`, isGuest: false })
  }
  await repo.profiles.create({ id: guest.id, username: 'guest-AB12', email: null, isGuest: true })
})

const base = (over: Partial<NewGame>): NewGame => ({
  userId: mira.id,
  kind: 'free',
  len: 4,
  zero: false,
  secret: '1234',
  dailyDate: null,
  practice: false,
  ...over,
})

async function played(over: Partial<NewGame> = {}, result: GamePatch = {}): Promise<PublicGameRow> {
  const game = await repo.games.create(base(over))
  return repo.games.update(game.id, {
    startedAt: now - 120_000,
    finishedAt: now,
    won: true,
    attempts: 6,
    score: 600,
    ...result,
  })
}

const daily = { kind: 'daily' as const, dailyDate: DATE }

async function dailyWins(count: number, attempts = 5) {
  for (let i = 0; i < count; i += 1) await played({ ...daily, userId: `p${i}` }, { attempts })
}

describe('distribution', () => {
  const q = { len: 4 as const, zero: false, kind: 'daily' as const, date: DATE }

  it('falls back to the prototype histogram below the minimum sample', async () => {
    expect(MIN_SAMPLE).toBe(30)
    await dailyWins(29)
    expect(await stats.distribution(q)).toEqual({
      histogram: [...FALLBACK_HISTOGRAM[4]],
      sample: 29,
      fallback: true,
    })
  })

  it('uses real wins from 30 on', async () => {
    await dailyWins(30, 5)
    const result = await stats.distribution(q)
    expect(result.fallback).toBe(false)
    expect(result.sample).toBe(30)
    expect(result.histogram[4]).toBe(30)
    expect(result.histogram).toHaveLength(FALLBACK_HISTOGRAM[4].length)
  })

  it('does not count practice, bot, lost, other-day or other-setting games', async () => {
    await dailyWins(29)
    await played({ ...daily, practice: true })
    await played({ kind: 'bot' })
    await played({ ...daily }, { won: false })
    await played({ ...daily, dailyDate: '2026-10-19' })
    await played({ ...daily, len: 5 })
    await played({ ...daily, zero: true })
    expect(await stats.distribution(q)).toMatchObject({ sample: 29, fallback: true })
  })

  it('takes free games of the last 30 days', async () => {
    const free = { ...q, kind: 'free' as const }
    now = START - 31 * DAY_MS
    await played({ userId: 'old' })
    now = START
    for (let i = 0; i < 29; i += 1) await played({ userId: `f${i}` })
    await played({ kind: 'bot' })
    expect(await stats.distribution(free)).toMatchObject({ sample: 29, fallback: true })
    await played({ userId: 'f29', practice: true })
    await played({ userId: 'f30' })
    expect(await new StatsService({ repo, clock }).distribution(free)).toMatchObject({
      sample: 30,
      fallback: false,
    })
  })

  it('caches a result for 60 seconds per key', async () => {
    await dailyWins(29)
    expect((await stats.distribution(q)).sample).toBe(29)
    await played({ ...daily, userId: 'late' })
    expect((await stats.distribution(q)).sample).toBe(29)
    expect((await stats.distribution({ ...q, zero: true })).sample).toBe(0)
    now += 61_000
    expect((await stats.distribution(q)).sample).toBe(30)
  })
})

describe('leaderboard', () => {
  const q = { period: 'today' as const, len: 4 as const, zero: false }

  it('ranks today by score and reports my rank, without practice games', async () => {
    await played({ ...daily, userId: rada.id }, { score: 900, attempts: 4 })
    await played({ ...daily, userId: mira.id }, { score: 700, attempts: 6 })
    await played({ ...daily, userId: ivo.id }, { score: 800, attempts: 5 })
    await played({ ...daily, userId: ivo.id, practice: true }, { score: 1100, attempts: 2 })
    const board = await stats.leaderboard(mira, q)
    expect(board.rows).toEqual([
      { rank: 1, username: 'Rada', attempts: 4, score: 900, you: false, level: 1, rankKey: 'herdsman', avatarSpecies: 'bull' },
      { rank: 2, username: 'Ivo', attempts: 5, score: 800, you: false, level: 1, rankKey: 'herdsman', avatarSpecies: 'bull' },
      { rank: 3, username: 'Mira', attempts: 6, score: 700, you: true, level: 1, rankKey: 'herdsman', avatarSpecies: 'bull' },
    ])
    expect(board.me).toMatchObject({ rank: 3, score: 700 })
    expect(board.me?.top).toBeGreaterThan(0)
  })

  it('gives each row the level and title of its player', async () => {
    const xp = 20_000
    await repo.profiles.addXp(rada.id, xp)
    await played({ ...daily, userId: rada.id }, { score: 900 })
    await played({ ...daily, userId: mira.id }, { score: 700 })
    const board = await stats.leaderboard(mira, q)
    const level = levelFromXp(xp)
    expect(level).toBeGreaterThan(1)
    expect(board.rows.map((r) => [r.username, r.level, r.rankKey])).toEqual([
      ['Rada', level, rankKeyForLevel(level)],
      ['Mira', 1, rankKeyForLevel(1)],
    ])
  })

  it('has no "me" for a player without a ranked game', async () => {
    await played({ ...daily, userId: rada.id })
    expect((await stats.leaderboard(ivo, q)).me).toBeNull()
  })

  it('ranks the week from Monday 00:00 Sofia, daily and free', async () => {
    now = Date.parse('2026-10-18T20:59:00Z') // Sunday 23:59 local
    await played({ userId: rada.id }, { score: 1000 })
    now = START
    await played({ userId: mira.id }, { score: 500 })
    const week = await stats.leaderboard(mira, { ...q, period: 'week' })
    expect(week.rows.map((r) => r.username)).toEqual(['Mira'])
    const all = await stats.leaderboard(mira, { ...q, period: 'all' })
    expect(all.rows.map((r) => r.username)).toEqual(['Rada', 'Mira'])
  })

  it('finds my place below the ranked list', async () => {
    for (let i = 1; i <= 120; i += 1) {
      const id = i === 110 ? mira.id : `r${i}`
      if (id !== mira.id) {
        await repo.profiles.create({ id, username: `R${i}`, email: null, isGuest: false })
      }
      await played({ ...daily, userId: id }, { score: 2000 - i, attempts: 5 })
    }
    const board = await stats.leaderboard(mira, q)
    expect(board.rows).toHaveLength(50)
    expect(board.me).toMatchObject({ rank: 110, score: 1890 })
    expect(board.me?.top).toBeGreaterThan(0)
    const near = await stats.leaderboard({ id: 'r60', isGuest: false }, q)
    expect(near.me).toMatchObject({ rank: 60, score: 1940 })
  })

  it('breaks score ties by earlier finish when ranking me separately', async () => {
    for (let i = 1; i <= 101; i += 1) {
      await repo.profiles.create({ id: `t${i}`, username: `T${i}`, email: null, isGuest: false })
      await played({ ...daily, userId: `t${i}` }, { score: 900 })
    }
    now += 1_000
    await played({ ...daily, userId: rada.id }, { score: 900 })
    now -= 2_000
    await played({ ...daily, userId: ivo.id }, { score: 100 })
    expect((await stats.leaderboard(rada, q)).me?.rank).toBe(102)
    expect((await stats.leaderboard(ivo, q)).me?.rank).toBe(103)
  })

  it('refuses guests', async () => {
    await expect(stats.leaderboard(guest, q)).rejects.toMatchObject({
      code: 'ERR_GUEST',
      status: 403,
    })
  })
})

describe('me', () => {
  it('derives level, xp into level and rank title from xp', async () => {
    await repo.profiles.addXp(mira.id, 3700)
    const me = await stats.me(mira)
    expect(me).toMatchObject({
      xp: 3700,
      level: 5,
      xpIntoLevel: 200,
      xpForNextLevel: 1500,
      rankKey: 'shepherd',
    })
    expect(me.rating).toBe(1500)
    expect(me.profile).toEqual({
      id: 'mira',
      username: 'Mira',
      isGuest: false,
      lang: 'bg',
      sound: true,
      vibrate: true,
      defaultLen: 4,
      avatarSpecies: 'bull',
    })
  })

  it('starts a new player at level 1 as a herdsman with empty stats', async () => {
    const me = await stats.me(mira)
    expect(me).toMatchObject({
      level: 1,
      xpForNextLevel: 500,
      rankKey: 'herdsman',
      currentGameId: null,
      recent: [],
    })
    expect(me.stats).toEqual({ played: 0, winRate: 0, streak: 0, best: null })
    expect(me.buckets.map((b) => b.attempts)).toEqual([3, 4, 5, 6, 7, 8, 9, 10])
    expect(Object.values(me.badges).some(Boolean)).toBe(false)
  })

  it('keeps a guest a calf whatever their xp', async () => {
    await repo.profiles.addXp(guest.id, 20_000)
    const me = await stats.me(guest)
    expect(me.level).toBeGreaterThan(1)
    expect(me.rankKey).toBe('calf')
  })

  it('counts solo, bot and duel games but not practice', async () => {
    now = START - 5_000
    await played({}, { attempts: 4, wasted: 1 })
    now = START - 4_000
    await played({ kind: 'bot' }, { attempts: 12, wasted: 1 })
    now = START - 3_000
    await played({ kind: 'duel_race' }, { won: false, attempts: 9 })
    now = START - 2_000
    await played({ ...daily }, { attempts: 7, wasted: 1 })
    now = START - 1_000
    await played({ ...daily, practice: true }, { attempts: 3, wasted: 0 })
    now = START
    const me = await stats.me(mira)
    expect(me.stats).toEqual({ played: 4, winRate: 75, streak: 1, best: 4 })
    const count = (k: number) => me.buckets.find((b) => b.attempts === k)?.count
    expect([count(3), count(4), count(7), count(10)]).toEqual([0, 1, 1, 1])
    expect(me.badges.noWaste).toBe(false)
    expect(me.badges.firstBull).toBe(true)
    expect(me.recent).toHaveLength(5)
    expect(me.recent[0]).toMatchObject({ practice: true, attempts: 3 })
  })

  it('reports the unfinished solo game to resume and the last ten finished games', async () => {
    for (let i = 0; i < 12; i += 1) {
      now = START + i
      await played({}, { attempts: 3 + (i % 5) })
    }
    now = START + 20
    const open = await repo.games.create(base({}))
    now = START + 21
    await repo.games.create(base({ kind: 'bot' }))
    const me = await stats.me(mira)
    expect(me.currentGameId).toBe(open.id)
    expect(me.recent).toHaveLength(10)
    expect(me.stats.played).toBe(12)
    expect(me.stats.streak).toBe(12)
  })

  it('awards chief bull and the quick-win badges from finished wins', async () => {
    await played({ len: 5 }, { attempts: 2, wasted: 0, startedAt: now - 30_000 })
    const me = await stats.me(mira)
    expect(me.badges).toEqual({
      firstBull: true,
      noWaste: true,
      underMinute: true,
      streak7: false,
      chiefBull: true,
      fiveDigits: true,
    })
  })

  it("measures daily wins against that day's real sample, with one grouped query", async () => {
    // 30 other players needed 8 attempts on day D; Mira's 5 is then top 2% (fallback: 8%).
    const D = '2026-09-01'
    for (let i = 0; i < 30; i += 1) {
      await played({ kind: 'daily', dailyDate: D, userId: `d${i}` }, { attempts: 8 })
    }
    for (let k = 1; k <= 39; k += 1) {
      const date = new Date(Date.UTC(2026, 6, k)).toISOString().slice(0, 10)
      await played({ kind: 'daily', dailyDate: date }, { attempts: 9 })
    }
    await played({ kind: 'daily', dailyDate: D }, { attempts: 5, wasted: 1 })
    const calls = { byDate: 0, single: 0 }
    const counting: Repo = {
      ...repo,
      games: {
        ...repo.games,
        wonAttemptsByDate: (q) => {
          calls.byDate += 1
          return repo.games.wonAttemptsByDate(q)
        },
        wonAttempts: (q) => {
          calls.single += 1
          return repo.games.wonAttempts(q)
        },
      },
    }
    const me = await new StatsService({ repo: counting, clock, cache: new DistributionCache() }).me(
      mira,
    )
    expect(me.badges.chiefBull).toBe(true)
    expect(calls).toEqual({ byDate: 1, single: 0 })
  })

  it('creates a missing profile on first read', async () => {
    const me = await stats.me({ id: 'newbie', isGuest: true })
    expect(me.profile.isGuest).toBe(true)
    expect(me.profile.username).toMatch(/^guest-[A-HJ-NP-Z2-9]{4}$/)
  })

  it('titles a guest a calf whatever the level', async () => {
    await repo.profiles.addXp(guest.id, 3700)
    expect(await stats.me(guest)).toMatchObject({ level: 5, rankKey: 'calf' })
  })
})

describe('updateSettings', () => {
  it('changes only the settings and returns the new profile', async () => {
    await repo.profiles.addXp(mira.id, 300)
    const me = await stats.updateSettings(mira, { sound: false, defaultLen: 5, lang: 'en' })
    expect(me.profile).toMatchObject({ sound: false, vibrate: true, defaultLen: 5, lang: 'en' })
    expect(me.xp).toBe(300)
    const sneaky = { vibrate: false, xp: 99_999, username: 'Boss' } as never
    const after = await stats.updateSettings(mira, sneaky)
    expect(after.profile).toMatchObject({ vibrate: false, username: 'Mira' })
    expect(after.xp).toBe(300)
  })

  it('lets guests change their settings', async () => {
    expect((await stats.updateSettings(guest, { vibrate: false })).profile.vibrate).toBe(false)
  })

  it('saves the chosen avatar character, a bull by default', async () => {
    expect((await stats.me(mira)).profile.avatarSpecies).toBe('bull')
    const me = await stats.updateSettings(mira, { avatarSpecies: 'cow' })
    expect(me.profile.avatarSpecies).toBe('cow')
    expect((await stats.me(mira)).profile.avatarSpecies).toBe('cow')
  })
})
