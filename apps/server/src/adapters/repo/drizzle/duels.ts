import { eq } from 'drizzle-orm'
import type { DuelsRepo } from '../../../ports/repo'
import type { Db } from './client'
import { required } from './errors'
import { toDate, toDuel } from './mappers'
import { duels } from './schema'

export function drizzleDuels(db: Db): DuelsRepo {
  return {
    create: async (input) => {
      const [row] = await db.insert(duels).values(input).returning()
      return toDuel(required(row))
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
  }
}
