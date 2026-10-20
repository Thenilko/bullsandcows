import { updateRating } from '@bc/game-core'
import { and, eq, sql } from 'drizzle-orm'
import type { DuelReward, DuelsRepo, RatingUpdate } from '../../../ports/repo'
import type { Db } from './client'
import { required } from './errors'
import { toDate, toDuel } from './mappers'
import { duels, profiles } from './schema'

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** The player's rating after `u`, computed from the row locked for this transaction. */
async function nextRating(tx: Tx, userId: string, u: RatingUpdate) {
  const [row] = await tx
    .select({ rating: profiles.rating, rd: profiles.ratingDev, vol: profiles.volatility })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .for('update')
  if (!row) return {}
  const next = updateRating(row, u.opponent, u.outcome).me
  return { rating: next.rating, ratingDev: next.rd, volatility: next.vol }
}

/** Credits one player inside the rewards transaction. */
async function credit(tx: Tx, r: DuelReward) {
  const rating = r.ratingUpdate ? await nextRating(tx, r.userId, r.ratingUpdate) : {}
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
