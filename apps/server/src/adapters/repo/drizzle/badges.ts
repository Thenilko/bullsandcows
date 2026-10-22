import { eq } from 'drizzle-orm'
import type { BadgesRepo } from '../../../ports/repo'
import type { Db } from './client'
import { userBadges } from './schema'

export function drizzleBadges(db: Db): BadgesRepo {
  return {
    listOf: async (userId) => {
      const rows = await db
        .select({ key: userBadges.badgeKey })
        .from(userBadges)
        .where(eq(userBadges.userId, userId))
      return rows.map((r) => r.key)
    },
    // A badge held already keeps its row (and `earnedAt`): the primary key decides.
    award: async (userId, keys, earnedAt) => {
      if (keys.length === 0) return
      const values = keys.map((badgeKey) => ({ userId, badgeKey, earnedAt: new Date(earnedAt) }))
      await db.insert(userBadges).values(values).onConflictDoNothing()
    },
  }
}
