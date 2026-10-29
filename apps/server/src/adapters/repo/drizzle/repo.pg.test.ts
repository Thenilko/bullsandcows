import { readdirSync, readFileSync } from 'node:fs'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { RepoHandle } from '../../../ports/repo'
import { createDrizzleRepo } from './repo'
import * as schema from './schema'

/**
 * Opt-in integration tests of the Postgres repos (`PG_TEST_URL`, see vitest.pg.config.ts): the transactions
 * and unique indexes that keep a farm at 12 members and a player in one farm, one weekly game per Sofia day
 * and one finalisation per week, under real concurrency. The database is wiped and migrated first.
 */
const URL_ENV = process.env.PG_TEST_URL
const MIGRATIONS = new URL('../../../../drizzle/', import.meta.url)
const NOW = Date.parse('2026-10-26T09:00:00Z')
const WEEK = '2026-W44'
const WEEK_END = Date.parse('2026-11-01T22:00:00Z')

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
async function profile(name = 'p'): Promise<string> {
  n += 1
  const id = crypto.randomUUID()
  await repo.profiles.create({ id, username: `${name}${n}`, email: null, isGuest: false })
  return id
}

describe.skipIf(!URL_ENV)('drizzle repos on Postgres', () => {
  beforeAll(async () => {
    sql = postgres(URL_ENV ?? '', { max: 20, onnotice: () => undefined })
    await migrate(sql)
    repo = createDrizzleRepo({ db: drizzle(sql, { schema }), close: async () => undefined })
  })

  afterAll(async () => {
    await sql?.end()
  })

  describe('farms', () => {
    it('never lets concurrent joins go beyond 12 members', async () => {
      const owner = await profile('owner')
      const farm = await repo.farms.create(
        { name: 'Петрови', inviteCode: 'K7Q2M', ownerId: owner },
        NOW,
      )
      if (!farm || farm === 'already') throw new Error('farm not created')
      const joiners = await Promise.all(Array.from({ length: 20 }, () => profile('j')))
      const outcomes = await Promise.all(joiners.map((u) => repo.farms.join(farm.id, u, 12, NOW)))
      expect(outcomes.filter((o) => o === 'joined')).toHaveLength(11)
      expect(outcomes.filter((o) => o === 'full')).toHaveLength(9)
      expect(await repo.farms.members(farm.id)).toHaveLength(12)
    })

    it('keeps a player in one farm, also when two joins race', async () => {
      const [a, b, u] = [await profile('a'), await profile('b'), await profile('u')]
      const fa = await repo.farms.create({ name: 'A', inviteCode: 'AAAA3', ownerId: a }, NOW)
      const fb = await repo.farms.create({ name: 'B', inviteCode: 'BBBB3', ownerId: b }, NOW)
      if (!fa || fa === 'already' || !fb || fb === 'already') throw new Error('farms not created')
      const outcomes = await Promise.all([
        repo.farms.join(fa.id, u, 12, NOW),
        repo.farms.join(fb.id, u, 12, NOW),
      ])
      expect([...outcomes].sort()).toEqual(['already', 'joined'])
      // Founding a farm while in one maps the unique violation to `already`.
      expect(await repo.farms.create({ name: 'C', inviteCode: 'CCCC3', ownerId: u }, NOW)).toBe(
        'already',
      )
    })

    it('maps a taken invite code to null (pick another)', async () => {
      const [a, b] = [await profile('a'), await profile('b')]
      expect(
        await repo.farms.create({ name: 'X', inviteCode: 'DDDD3', ownerId: a }, NOW),
      ).not.toBeNull()
      expect(
        await repo.farms.create({ name: 'Y', inviteCode: 'DDDD3', ownerId: b }, NOW),
      ).toBeNull()
      expect(await repo.farms.membershipOf(b)).toBeNull()
    })
  })

  describe('weekly', () => {
    const game = (userId: string, id: string) => ({
      id,
      userId,
      kind: 'weekly' as const,
      len: 4 as const,
      zero: false,
      secret: '1234',
      dailyDate: null,
      practice: false,
    })

    it('creates the week once and keeps the first secret', async () => {
      const first = await repo.weekly.ensureWeek(
        { weekId: WEEK, ruleKey: 'quickFour', secret: '1234', endsAt: WEEK_END },
        NOW,
      )
      const again = await repo.weekly.ensureWeek(
        { weekId: WEEK, ruleKey: 'quickFour', secret: '9876', endsAt: WEEK_END },
        NOW,
      )
      expect(again.secret).toBe(first.secret)
      expect(again.endsAt).toBe(WEEK_END)
    })

    it('allows one game per player and Sofia day, also when two starts race', async () => {
      const u = await profile('w')
      const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
      const started = await Promise.all(
        ids.map((id) =>
          repo.weekly.startPlay(game(u, id), {
            userId: u,
            weekId: WEEK,
            day: '2026-10-26',
            gameId: id,
          }),
        ),
      )
      expect(started.filter((g) => g !== null)).toHaveLength(1)
      // The losers' games were rolled back with their plays.
      const [{ count }] = await sql<
        { count: number }[]
      >`select count(*)::int as count from games where user_id = ${u}`
      expect(count).toBe(1)
      const next = crypto.randomUUID()
      expect(
        await repo.weekly.startPlay(game(u, next), {
          userId: u,
          weekId: WEEK,
          day: '2026-10-27',
          gameId: next,
        }),
      ).not.toBeNull()
    })

    it('finalises a week once: XP, the gold frame and the results, however many runs race', async () => {
      const winner = await profile('win')
      const loser = await profile('lose')
      for (const [u, won] of [
        [winner, true],
        [loser, false],
      ] as const) {
        const id = crypto.randomUUID()
        await repo.weekly.startPlay(game(u, id), {
          userId: u,
          weekId: WEEK,
          day: '2026-10-28',
          gameId: id,
        })
        await repo.weekly.finishPlay(id, { attempts: 5, secs: 90, won, finishedAt: NOW + 1000 })
      }
      const plays = await repo.weekly.finishedPlays(WEEK)
      expect(plays.map((p) => p.userId)).toEqual(expect.arrayContaining([winner, loser]))
      expect((await repo.weekly.dueWeeks(WEEK_END - 1)).map((w) => w.weekId)).not.toContain(WEEK)
      expect((await repo.weekly.dueWeeks(WEEK_END)).map((w) => w.weekId)).toContain(WEEK)

      const before = (await repo.profiles.get(winner))?.xp ?? 0
      const results = [
        {
          weekId: WEEK,
          userId: winner,
          place: 1,
          participants: 2,
          won: true,
          attempts: 5,
          secs: 90,
          xp: 300,
          goldFrame: true,
        },
        {
          weekId: WEEK,
          userId: loser,
          place: null,
          participants: 2,
          won: false,
          attempts: null,
          secs: null,
          xp: 0,
          goldFrame: false,
        },
      ]
      const until = Date.parse('2026-11-08T22:00:00Z')
      const runs = await Promise.all(
        Array.from({ length: 4 }, () =>
          repo.weekly.finalize({
            weekId: WEEK,
            now: WEEK_END,
            participants: 2,
            results,
            goldFrameUntil: until,
          }),
        ),
      )
      expect(runs.filter(Boolean)).toHaveLength(1)
      const after = await repo.profiles.get(winner)
      expect((after?.xp ?? 0) - before).toBe(300)
      expect(after?.goldFrameUntil).toBe(until)
      expect((await repo.profiles.get(loser))?.goldFrameUntil).toBeNull()
      expect(await repo.weekly.weeksWon(winner)).toBe(1)
      expect(await repo.weekly.unseenResult(winner)).toMatchObject({
        weekId: WEEK,
        place: 1,
        xp: 300,
        goldFrame: true,
      })
      await repo.weekly.markSeen(winner, WEEK_END)
      expect(await repo.weekly.unseenResult(winner)).toBeNull()
      expect((await repo.weekly.week(WEEK))?.finalizedAt).toBe(WEEK_END)
      expect(await repo.weekly.dueWeeks(WEEK_END + 1)).toEqual([])
      // A later run (the second cron) changes nothing.
      expect(
        await repo.weekly.finalize({
          weekId: WEEK,
          now: WEEK_END,
          participants: 2,
          results,
          goldFrameUntil: until,
        }),
      ).toBe(false)
      expect((await repo.profiles.get(winner))?.xp).toBe(after?.xp)

      // The frame reaches the boards as Unix ms (joins and the leaderboard's subquery included).
      const entry = (await repo.weekly.finishedPlays(WEEK)).find((p) => p.userId === winner)
      expect(entry?.goldFrameUntil).toBe(until)
      const free = await repo.games.create({
        userId: winner,
        kind: 'free',
        len: 4,
        zero: false,
        secret: '1234',
        dailyDate: null,
        practice: false,
      })
      await repo.games.update(free.id, {
        startedAt: NOW,
        finishedAt: NOW + 60_000,
        won: true,
        attempts: 4,
        score: 500,
      })
      const rows = await repo.games.leaderboard({
        period: 'all',
        len: 4,
        zero: false,
        date: '2026-10-26',
        weekStartMs: NOW - 1,
      })
      expect(rows.find((r) => r.userId === winner)?.goldFrameUntil).toBe(until)
      // The ВРЕМЕ column: from the start to the winning guess.
      expect(rows.find((r) => r.userId === winner)?.durationMs).toBe(60_000)
    })
  })

  describe('inactive guests', () => {
    it('deletes only guests idle since the cutoff, with their games', async () => {
      const guest = async (createdAt: string) => {
        const id = crypto.randomUUID()
        await repo.profiles.create({
          id,
          username: `g${id.slice(0, 8)}`,
          email: null,
          isGuest: true,
        })
        await sql`update profiles set created_at = ${createdAt}::timestamptz where id = ${id}`
        return id
      }
      const idle = await guest('2025-01-01T00:00:00Z')
      const active = await guest('2025-01-01T00:00:00Z')
      const young = await guest('2026-10-01T00:00:00Z')
      const game = async (userId: string, createdAt: string) => {
        const g = await repo.games.create({
          userId,
          kind: 'free',
          len: 4,
          zero: false,
          secret: '1234',
          dailyDate: null,
          practice: false,
        })
        await sql`update games set created_at = ${createdAt}::timestamptz where id = ${g.id}`
        return g.id
      }
      const oldGame = await game(idle, '2025-02-01T00:00:00Z')
      await game(active, '2026-06-01T00:00:00Z')
      const duel = await repo.duels.create({
        format: 'race',
        len: 4,
        zero: false,
        opponentKind: 'friend',
        botLevel: null,
        inviteCode: null,
        playerA: idle,
        playerB: active,
        gameA: oldGame,
        gameB: null,
      })

      const deleted = await repo.profiles.deleteInactiveGuests(
        Date.parse('2025-10-28T00:00:00Z'),
        50,
      )

      expect(deleted).toContain(idle)
      expect(deleted).not.toContain(active)
      expect(deleted).not.toContain(young)
      expect(await repo.games.get(oldGame)).toBeNull()
      expect(await repo.duels.get(duel.id)).toMatchObject({
        playerA: null,
        playerB: active,
        gameA: null,
      })
    })
  })

  describe('admin overview', () => {
    it('counts users, Sofia days, kinds and duels, and lists the recently active first', async () => {
      const at = Date.parse('2026-10-29T10:00:00Z')
      const query = { now: at, days: ['2026-10-28', '2026-10-29'], recentLimit: 500 }
      const before = await repo.admin.overview(query)
      const member = await profile('adm')
      const guest = crypto.randomUUID()
      await repo.profiles.create({ id: guest, username: `ag${guest.slice(0, 6)}`, email: null, isGuest: true })
      // 23:30 UTC on the 28th is already the 29th in Sofia.
      await sql`update profiles set created_at = '2026-10-28T23:30:00Z' where id in (${member}, ${guest})`
      const play = async (userId: string, kind: 'free' | 'weekly', won: boolean | null, attempts: number) => {
        const g = await repo.games.create({ userId, kind, len: 4, zero: false, secret: '1234', dailyDate: null, practice: false })
        await sql`update games set created_at = '2026-10-29T08:00:00Z', won = ${won}, attempts = ${attempts},
          finished_at = ${won === null ? null : '2026-10-29T08:05:00Z'} where id = ${g.id}`
      }
      await play(member, 'free', true, 6)
      await play(member, 'weekly', true, 4)
      await play(guest, 'free', null, 2)
      await repo.duels.create({ format: 'race', len: 4, zero: false, opponentKind: 'bot', botLevel: 2, inviteCode: null, playerA: member, playerB: null, gameA: null, gameB: null })

      const after = await repo.admin.overview(query)
      expect(after.users.total - before.users.total).toBe(2)
      expect(after.users.guests - before.users.guests).toBe(1)
      expect(after.users.active1d - before.users.active1d).toBe(2)
      const day = (rows: typeof after.days, date: string) => rows.find((d) => d.date === date)
      expect((day(after.days, '2026-10-29')?.newUsers ?? 0) - (day(before.days, '2026-10-29')?.newUsers ?? 0)).toBe(2)
      expect((day(after.days, '2026-10-29')?.games ?? 0) - (day(before.days, '2026-10-29')?.games ?? 0)).toBe(3)
      expect(after.days.every((d) => query.days.includes(d.date))).toBe(true)
      const kind = (rows: typeof after.kinds, k: string) => rows.find((r) => r.kind === k)
      expect(kind(after.kinds, 'weekly')).toMatchObject({ total: (kind(before.kinds, 'weekly')?.total ?? 0) + 1 })
      expect((kind(after.kinds, 'free')?.wonAttempts ?? 0) - (kind(before.kinds, 'free')?.wonAttempts ?? 0)).toBe(6)
      expect(after.social.duelsByOpponent.bot - before.social.duelsByOpponent.bot).toBe(1)
      expect(after.social.weeklyPlayers7d - before.social.weeklyPlayers7d).toBe(1)
      const mine = after.recentUsers.find((u) => u.id === member)
      expect(mine).toMatchObject({ games: 2, isGuest: false, lastGameAt: Date.parse('2026-10-29T08:00:00Z') })
      const order = after.recentUsers.map((u) => u.lastGameAt ?? -1)
      expect(order).toEqual([...order].sort((a, b) => b - a))
    })
  })
})
