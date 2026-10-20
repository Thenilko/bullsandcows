import { and, asc, desc, eq, getTableColumns, gte, type SQL } from 'drizzle-orm'
import type { GamePatch, GamesRepo, WonAttemptsQuery } from '../../../ports/repo'
import type { Db } from './client'
import { required } from './errors'
import { drizzleLeaderboard } from './leaderboard'
import { toDate, toGame, toGuess, toPublicGame } from './mappers'
import { dailyNumbers, games, guesses } from './schema'

/** Every column except `secret`: the default projection for all game reads and writes. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { secret: _secretColumn, ...publicColumns } = getTableColumns(games)

function patchColumns(patch: GamePatch): Partial<typeof games.$inferInsert> {
  const { startedAt, finishedAt, ...rest } = patch
  return { ...rest, startedAt: toDate(startedAt), finishedAt: toDate(finishedAt) }
}

function wonFilter(q: WonAttemptsQuery): SQL | undefined {
  return and(
    eq(games.kind, q.kind),
    eq(games.len, q.len),
    eq(games.zero, q.zero),
    eq(games.won, true),
    eq(games.practice, false),
    q.date === undefined ? undefined : eq(games.dailyDate, q.date),
    q.sinceMs === undefined ? undefined : gte(games.finishedAt, new Date(q.sinceMs)),
  )
}

export function drizzleGames(db: Db): GamesRepo {
  return {
    create: async (input) => {
      const [row] = await db.insert(games).values(input).returning(publicColumns)
      return toPublicGame(required(row))
    },
    get: async (id) => {
      const [row] = await db.select(publicColumns).from(games).where(eq(games.id, id)).limit(1)
      return row ? toPublicGame(row) : null
    },
    getWithSecret: async (id) => {
      const [row] = await db.select().from(games).where(eq(games.id, id)).limit(1)
      return row ? toGame(row) : null
    },
    update: async (id, patch) => {
      const columns = patchColumns(patch)
      const [row] = Object.values(columns).some((v) => v !== undefined)
        ? await db.update(games).set(columns).where(eq(games.id, id)).returning(publicColumns)
        : await db.select(publicColumns).from(games).where(eq(games.id, id)).limit(1)
      return toPublicGame(required(row))
    },
    addGuess: async (input) => {
      const [row] = await db
        .insert(guesses)
        .values({ ...input, at: new Date(input.at) })
        .returning()
      return toGuess(required(row))
    },
    guesses: async (gameId) => {
      const rows = await db
        .select()
        .from(guesses)
        .where(eq(guesses.gameId, gameId))
        .orderBy(asc(guesses.id))
      return rows.map(toGuess)
    },
    dailyOf: async (userId, date, len, zero) => {
      const [row] = await db
        .select(publicColumns)
        .from(games)
        .where(
          and(
            eq(games.userId, userId),
            eq(games.kind, 'daily'),
            eq(games.practice, false),
            eq(games.dailyDate, date),
            eq(games.len, len),
            eq(games.zero, zero),
          ),
        )
        .orderBy(asc(games.createdAt))
        .limit(1)
      return row ? toPublicGame(row) : null
    },
    wonAttempts: async (q) => {
      const rows = await db.select({ attempts: games.attempts }).from(games).where(wonFilter(q))
      return rows.map((r) => r.attempts)
    },
    leaderboard: (q) => drizzleLeaderboard(db, q),
    recordDailyNumber: async (date, len, zero, idx) => {
      await db.insert(dailyNumbers).values({ date, len, zero, idx }).onConflictDoNothing()
    },
    history: async (userId, limit) => {
      const rows = await db
        .select(publicColumns)
        .from(games)
        .where(eq(games.userId, userId))
        .orderBy(desc(games.createdAt))
        .limit(limit)
      return rows.map(toPublicGame)
    },
  }
}
