import { eq, sql } from 'drizzle-orm'
import type { BadgesRepo, BadgeState } from '../../../ports/repo'
import type { Db } from './client'
import { userBadges } from './schema'

const toState = (row: typeof userBadges.$inferSelect): BadgeState => ({
  key: row.badgeKey,
  tier: row.tier,
  progress: row.progress,
  earnedAt: row.earnedAt.getTime(),
})

export function drizzleBadges(db: Db): BadgesRepo {
  return {
    listOf: async (userId) => {
      const rows = await db.select().from(userBadges).where(eq(userBadges.userId, userId))
      return rows.map(toState)
    },
    // The service decides tier, progress and earnedAt; the row is simply overwritten.
    save: async (userId, rows) => {
      if (rows.length === 0) return
      const values = rows.map((r) => ({
        userId,
        badgeKey: r.key,
        tier: r.tier,
        progress: r.progress,
        earnedAt: new Date(r.earnedAt),
      }))
      await db
        .insert(userBadges)
        .values(values)
        .onConflictDoUpdate({
          target: [userBadges.userId, userBadges.badgeKey],
          set: {
            tier: sql`excluded.tier`,
            progress: sql`excluded.progress`,
            earnedAt: sql`excluded.earned_at`,
          },
        })
    },
  }
}
