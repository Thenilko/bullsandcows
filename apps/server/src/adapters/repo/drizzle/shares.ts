import { count, eq } from 'drizzle-orm'
import type { SharesRepo } from '../../../ports/repo'
import type { Db } from './client'
import { shares } from './schema'

export function drizzleShares(db: Db): SharesRepo {
  return {
    // The unique index on (user, game) decides: a repeat insert returns no row.
    add: async (share) => {
      const inserted = await db
        .insert(shares)
        .values({ ...share, createdAt: new Date(share.createdAt) })
        .onConflictDoNothing({ target: [shares.userId, shares.gameId] })
        .returning({ id: shares.id })
      return inserted.length > 0
    },
    countOf: async (userId) => {
      const [row] = await db.select({ n: count() }).from(shares).where(eq(shares.userId, userId))
      return row?.n ?? 0
    },
  }
}
