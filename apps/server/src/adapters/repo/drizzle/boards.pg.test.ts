import { readdirSync, readFileSync } from 'node:fs'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { BoardRepoQuery, GameKind, OpponentKind, RepoHandle } from '../../../ports/repo'
import { createDrizzleRepo } from './repo'
import * as schema from './schema'

/** The extra boards' SQL on Postgres (`PG_TEST_URL`, see vitest.pg.config.ts); the database is wiped first. */
const URL_ENV = process.env.PG_TEST_URL
const MIGRATIONS = new URL('../../../../drizzle/', import.meta.url)
const NOW = Date.parse('2026-11-05T10:00:00Z')

let sql: postgres.Sql
let repo: RepoHandle

async function migrate(client: postgres.Sql): Promise<void> {
  await client.unsafe('drop schema if exists public cascade; create schema public;')
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const file of files) {
    const text = readFileSync(new URL(file, MIGRATIONS), 'utf8')
    for (const statement of text.split('--> statement-breakpoint')) {
      if (statement.trim()) await client.unsafe(statement)
    }
  }
}

let n = 0
async function member(name: string, guest = false): Promise<string> {
  n += 1
  const id = crypto.randomUUID()
  await repo.profiles.create({ id, username: `${name}${n}`, email: null, isGuest: guest })
  return id
}

async function duel(
  a: string,
  b: string | null,
  winner: string | null,
  kind: OpponentKind = 'quick',
) {
  const d = await repo.duels.create({
    format: 'race',
    len: 4,
    zero: false,
    opponentKind: kind,
    botLevel: kind === 'bot' ? 1 : null,
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

async function game(userId: string, kind: GameKind, finishedAt: number, practice = false) {
  const g = await repo.games.create({
    userId,
    kind,
    len: 4,
    zero: false,
    secret: '1234',
    dailyDate: null,
    practice,
  })
  await repo.games.update(g.id, { finishedAt, won: true, attempts: 5, score: 10 })
}

const q = (kind: BoardRepoQuery['kind'], viewer = crypto.randomUUID()): BoardRepoQuery => ({
  kind,
  viewer,
  sinceMs: NOW - 3_600_000,
  liveFrom: '2026-11-04',
})

describe.skipIf(!URL_ENV)('drizzle boards on Postgres', () => {
  beforeAll(async () => {
    sql = postgres(URL_ENV ?? '', { max: 4, onnotice: () => undefined })
    await migrate(sql)
    repo = createDrizzleRepo({ db: drizzle(sql, { schema }), close: async () => undefined })
  })

  beforeEach(async () => {
    await sql.unsafe('truncate profiles, games, duels cascade')
  })

  afterAll(async () => {
    await sql?.end()
  })

  it('duels: rating order, W–L–D of human duels, no guests or bot-only players', async () => {
    const [a, b, c, botOnly] = [
      await member('a'),
      await member('b'),
      await member('c'),
      await member('bot'),
    ]
    const g = await member('g', true)
    await repo.profiles.setRating(a, { rating: 1600, rd: 100, vol: 0.06 })
    await repo.profiles.setRating(b, { rating: 1700, rd: 100, vol: 0.06 })
    await repo.profiles.setRating(g, { rating: 2000, rd: 100, vol: 0.06 })
    await repo.profiles.setRating(botOnly, { rating: 1900, rd: 100, vol: 0.06 })
    await duel(a, b, a)
    await duel(a, b, null, 'friend')
    await duel(c, g, g)
    await duel(botOnly, null, botOnly, 'bot')
    const rows = await repo.boards.top(q('duels'))
    expect(rows.map((r) => [r.userId, r.value, r.wins, r.losses, r.draws])).toEqual([
      [b, 1700, 0, 1, 1],
      [a, 1600, 1, 0, 1],
      [c, 1500, 0, 1, 0],
    ])
    expect(rows[0]?.best).toBeUndefined()
    expect(await repo.boards.placeOf(q('duels'), c)).toEqual({ rank: 3, value: 1500 })
    expect(await repo.boards.placeOf(q('duels'), botOnly)).toBeNull()
  })

  it('streaks: live ones only, ties by the best streak', async () => {
    const [a, b, old] = [await member('a'), await member('b'), await member('old')]
    await repo.profiles.setStreak(a, { currentStreak: 3, bestStreak: 3, streakDate: '2026-11-04' })
    await repo.profiles.setStreak(b, { currentStreak: 3, bestStreak: 9, streakDate: '2026-11-05' })
    await repo.profiles.setStreak(old, {
      currentStreak: 20,
      bestStreak: 20,
      streakDate: '2026-11-03',
    })
    const rows = await repo.boards.top(q('streaks'))
    expect(rows.map((r) => [r.userId, r.value, r.best])).toEqual([
      [b, 3, 9],
      [a, 3, 3],
    ])
  })

  it('herders: xp order, members with xp only', async () => {
    const [a, b] = [await member('a'), await member('b')]
    const g = await member('g', true)
    await member('zero')
    await repo.profiles.addXp(a, 40)
    await repo.profiles.addXp(b, 90)
    await repo.profiles.addXp(g, 900)
    const rows = await repo.boards.top(q('herders'))
    expect(rows.map((r) => [r.userId, r.value])).toEqual([
      [b, 90],
      [a, 40],
    ])
    expect(await repo.boards.placeOf(q('herders'), a)).toEqual({ rank: 2, value: 40 })
  })

  it('games: counted solo and duel games in the period, ties by the earlier last finish', async () => {
    const [a, b] = [await member('a'), await member('b')]
    await game(a, 'daily', NOW - 1000)
    await game(a, 'duel_race', NOW - 500)
    await game(a, 'free', NOW, true)
    await game(a, 'weekly', NOW)
    await game(b, 'free', NOW - 2000)
    await game(b, 'bot', NOW - 1500)
    await game(b, 'free', NOW - 7_200_000)
    const rows = await repo.boards.top(q('games'))
    expect(rows.map((r) => [r.userId, r.value])).toEqual([
      [b, 2],
      [a, 2],
    ])
  })

  it('friends: me and my human duel opponents by xp, with my head-to-head record', async () => {
    const [me, f1, f2, stranger] = [
      await member('me'),
      await member('f'),
      await member('f'),
      await member('s'),
    ]
    const g = await member('g', true)
    await repo.profiles.addXp(f1, 100)
    await repo.profiles.addXp(me, 50)
    await duel(me, f1, me)
    await duel(f1, me, f1)
    await duel(f1, me, me)
    await duel(f2, me, null)
    await duel(me, g, me)
    await duel(f1, stranger, f1)
    await duel(me, null, me, 'bot')
    const rows = await repo.boards.top(q('friends', me))
    expect(rows.map((r) => [r.userId, r.value, r.wins, r.losses, r.draws])).toEqual([
      [f1, 100, 2, 1, 0],
      [me, 50, undefined, undefined, undefined],
      [f2, 0, 0, 0, 1],
    ])
    expect(await repo.boards.placeOf(q('friends', me), f2)).toEqual({ rank: 3, value: 0 })
    const alone = await repo.boards.top(q('friends', await member('new')))
    expect(alone).toHaveLength(1)
  })
})
