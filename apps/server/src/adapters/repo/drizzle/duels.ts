import { and, eq, sql } from 'drizzle-orm'
import type { DuelReward, DuelsRepo } from '../../../ports/repo'
import type { Db } from './client'
import { required } from './errors'
import { toDate, toDuel } from './mappers'
import { duels, profiles } from './schema'

/** Credits one player inside the rewards transaction. */
async function credit(tx: Parameters<Parameters<Db['transaction']>[0]>[0], r: DuelReward) {
  const rating = r.rating
    ? { rating: r.rating.rating, ratingDev: r.rating.rd, volatility: r.rating.vol }
    : {}
  await tx
    .update(profiles)
    .set({ xp: sql`${profiles.xp} + ${r.xp}`, ...rating })
    .where(eq(profiles.id, r.userId))
}

export function drizzleDuels(db: Db): DuelsRepo {
  return {
    create: async (input) => {
      const [row] = await db
        .insert(duels)
        .values(input)
        .onConflictDoNothing({ target: duels.id })
        .returning()
      if (row) return toDuel(row)
      const [existing] = await db
        .select()
        .from(duels)
        .where(eq(duels.id, required(input.id)))
        .limit(1)
      return toDuel(required(existing))
    },
    finish: async (id, patch) => {
      const finishedAt = toDate(patch.finishedAt) ?? new Date()
      const [row] = await db
        .update(duels)
        .set({ ...patch, finishedAt })
        .where(eq(duels.id, id))
        .returning()
      return toDuel(required(row))
    },
    get: async (id) => {
      const [row] = await db.select().from(duels).where(eq(duels.id, id)).limit(1)
      return row ? toDuel(row) : null
    },
    applyRewards: async (id, rewards) =>
      db.transaction(async (tx) => {
        const [claimed] = await tx
          .update(duels)
          .set({ rewardsApplied: true })
          .where(and(eq(duels.id, id), eq(duels.rewardsApplied, false)))
          .returning({ id: duels.id })
        if (!claimed) {
          const [exists] = await tx.select({ id: duels.id }).from(duels).where(eq(duels.id, id))
          required(exists)
          return false
        }
        for (const r of rewards) await credit(tx, r)
        return true
      }),
  }
}
