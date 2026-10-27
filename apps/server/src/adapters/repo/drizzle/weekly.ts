import { and, desc, eq, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm'
import type { WeeklyPlayRow, WeeklyRepo, WeeklyResultRow, WeekRow } from '../../../ports/repo'
import type { Db } from './client'
import { isUniqueViolation } from './errors'
import { publicColumns } from './games'
import { toPublicGame } from './mappers'
import { games, profiles, weekly, weeklyPlays, weeklyResults } from './schema'

const ms = (d: Date | string | null): number | null => (d === null ? null : new Date(d).getTime())

const toWeek = (row: typeof weekly.$inferSelect): WeekRow => ({
  ...row,
  endsAt: row.endsAt.getTime(),
  createdAt: row.createdAt.getTime(),
  finalizedAt: ms(row.finalizedAt),
})

const toPlay = (row: typeof weeklyPlays.$inferSelect): WeeklyPlayRow => ({
  ...row,
  finishedAt: ms(row.finishedAt),
  createdAt: row.createdAt.getTime(),
})

const toResult = (row: typeof weeklyResults.$inferSelect): WeeklyResultRow => ({
  ...row,
  seenAt: ms(row.seenAt),
  createdAt: row.createdAt.getTime(),
})

export function drizzleWeekly(db: Db): WeeklyRepo {
  const weekById = async (weekId: string) => {
    const [row] = await db.select().from(weekly).where(eq(weekly.weekId, weekId)).limit(1)
    return row ? toWeek(row) : null
  }

  return {
    ensureWeek: async (input, now) => {
      await db
        .insert(weekly)
        .values({ ...input, endsAt: new Date(input.endsAt), createdAt: new Date(now) })
        .onConflictDoNothing({ target: weekly.weekId })
      const row = await weekById(input.weekId)
      if (!row) throw new Error('weekly: the week vanished after insert')
      return row
    },
    week: weekById,
    startPlay: async (game, play) => {
      try {
        return await db.transaction(async (tx) => {
          const [row] = await tx.insert(games).values(game).returning(publicColumns)
          if (!row) throw new Error('weekly: game insert returned nothing')
          await tx.insert(weeklyPlays).values(play)
          return toPublicGame(row)
        })
      } catch (err) {
        // A second start on the same Sofia day (also two at once): the unique index decides, nothing stays.
        if (isUniqueViolation(err, 'weekly_plays_user_day_idx')) return null
        throw err
      }
    },
    playOn: async (userId, day) => {
      const [row] = await db
        .select()
        .from(weeklyPlays)
        .where(and(eq(weeklyPlays.userId, userId), eq(weeklyPlays.day, day)))
        .limit(1)
      return row ? toPlay(row) : null
    },
    playByGame: async (gameId) => {
      const [row] = await db
        .select()
        .from(weeklyPlays)
        .where(eq(weeklyPlays.gameId, gameId))
        .limit(1)
      return row ? toPlay(row) : null
    },
    openPlays: async (userId, weekId) => {
      const rows = await db
        .select()
        .from(weeklyPlays)
        .where(
          and(
            eq(weeklyPlays.userId, userId),
            eq(weeklyPlays.weekId, weekId),
            isNull(weeklyPlays.finishedAt),
          ),
        )
      return rows.map(toPlay)
    },
    finishPlay: async (gameId, finish) => {
      await db
        .update(weeklyPlays)
        .set({ ...finish, finishedAt: new Date(finish.finishedAt) })
        .where(eq(weeklyPlays.gameId, gameId))
    },
    finishedPlays: async (weekId) => {
      const rows = await db
        .select({
          play: weeklyPlays,
          username: profiles.username,
          xp: profiles.xp,
          avatarSpecies: profiles.avatarSpecies,
          goldFrameUntil: profiles.goldFrameUntil,
        })
        .from(weeklyPlays)
        .innerJoin(profiles, eq(profiles.id, weeklyPlays.userId))
        .where(
          and(
            eq(weeklyPlays.weekId, weekId),
            isNotNull(weeklyPlays.finishedAt),
            eq(profiles.isGuest, false),
          ),
        )
      return rows.map((r) => ({
        ...toPlay(r.play),
        username: r.username,
        xp: r.xp,
        avatarSpecies: r.avatarSpecies,
        goldFrameUntil: ms(r.goldFrameUntil),
      }))
    },
    dueWeeks: async (now) => {
      const rows = await db
        .select()
        .from(weekly)
        .where(and(isNull(weekly.finalizedAt), lte(weekly.endsAt, new Date(now))))
        .orderBy(weekly.endsAt)
      return rows.map(toWeek)
    },
    finalize: async ({ weekId, now, participants, results, goldFrameUntil }) =>
      db.transaction(async (tx) => {
        // The week row is the lock: a cron run and a lazy run of the same week queue here.
        const [week] = await tx.select().from(weekly).where(eq(weekly.weekId, weekId)).for('update')
        if (!week || week.finalizedAt !== null) return false
        const at = new Date(now)
        if (results.length > 0) {
          await tx.insert(weeklyResults).values(results.map((r) => ({ ...r, createdAt: at })))
        }
        for (const r of results.filter((x) => x.xp > 0)) {
          await tx
            .update(profiles)
            .set({ xp: sql`${profiles.xp} + ${r.xp}` })
            .where(eq(profiles.id, r.userId))
        }
        const framed = results.filter((r) => r.goldFrame).map((r) => r.userId)
        if (framed.length > 0) {
          const until = new Date(goldFrameUntil)
          await tx
            .update(profiles)
            .set({
              goldFrameUntil: sql`greatest(coalesce(${profiles.goldFrameUntil}, ${until}), ${until})`,
            })
            .where(inArray(profiles.id, framed))
        }
        await tx
          .update(weekly)
          .set({ finalizedAt: at, participants })
          .where(eq(weekly.weekId, weekId))
        return true
      }),
    unseenResult: async (userId) => {
      const [row] = await db
        .select()
        .from(weeklyResults)
        .where(and(eq(weeklyResults.userId, userId), isNull(weeklyResults.seenAt)))
        .orderBy(desc(weeklyResults.weekId))
        .limit(1)
      return row ? toResult(row) : null
    },
    markSeen: async (userId, now) => {
      await db
        .update(weeklyResults)
        .set({ seenAt: new Date(now) })
        .where(and(eq(weeklyResults.userId, userId), isNull(weeklyResults.seenAt)))
    },
    weeksWon: async (userId) => {
      const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(weeklyResults)
        .where(and(eq(weeklyResults.userId, userId), eq(weeklyResults.won, true)))
      return row?.n ?? 0
    },
  }
}
