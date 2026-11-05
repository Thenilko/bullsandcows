import { and, desc, eq, gt } from 'drizzle-orm'
import type { ChallengeRow, ChallengesRepo } from '../../../ports/repo'
import type { Db } from './client'
import { challenges, profiles } from './schema'

const toChallenge = (row: typeof challenges.$inferSelect): ChallengeRow => ({
  ...row,
  createdAt: row.createdAt.getTime(),
  expiresAt: row.expiresAt.getTime(),
})

const isUuid = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export function drizzleChallenges(db: Db): ChallengesRepo {
  return {
    create: async (input, now) => {
      const [row] = await db
        .insert(challenges)
        .values({ ...input, createdAt: new Date(now), expiresAt: new Date(input.expiresAt) })
        .returning()
      if (!row) throw new Error('challenge insert returned no row')
      return toChallenge(row)
    },
    get: async (id) => {
      if (!isUuid(id)) return null
      const [row] = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1)
      return row ? toChallenge(row) : null
    },
    incoming: async (toId, now, limit) => {
      const rows = await db
        .select({
          challenge: challenges,
          fromUsername: profiles.username,
          fromXp: profiles.xp,
          fromAvatarSpecies: profiles.avatarSpecies,
        })
        .from(challenges)
        .innerJoin(profiles, eq(profiles.id, challenges.fromId))
        .where(
          and(
            eq(challenges.toId, toId),
            eq(challenges.status, 'pending'),
            gt(challenges.expiresAt, new Date(now)),
          ),
        )
        .orderBy(desc(challenges.createdAt), desc(challenges.id))
        .limit(limit)
      return rows.map(({ challenge, ...from }) => ({ ...toChallenge(challenge), ...from }))
    },
    cancelBetween: async (fromId, toId) => {
      await db
        .update(challenges)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(challenges.fromId, fromId),
            eq(challenges.toId, toId),
            eq(challenges.status, 'pending'),
          ),
        )
    },
    // Conditional on `pending`, so two racing answers cannot both win.
    settle: async (id, status) => {
      if (!isUuid(id)) return false
      const rows = await db
        .update(challenges)
        .set({ status })
        .where(and(eq(challenges.id, id), eq(challenges.status, 'pending')))
        .returning({ id: challenges.id })
      return rows.length > 0
    },
  }
}
