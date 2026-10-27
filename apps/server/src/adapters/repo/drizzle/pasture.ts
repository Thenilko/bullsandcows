import { eq } from 'drizzle-orm'
import type { PastureRepo } from '../../../ports/repo'
import type { Db } from './client'
import { userPasture } from './schema'

export function drizzlePasture(db: Db): PastureRepo {
  return {
    get: async (userId) => {
      const [row] = await db.select().from(userPasture).where(eq(userPasture.userId, userId))
      return row ? { hiddenItems: row.hiddenItems, barnColor: row.barnColor } : null
    },
    save: async (userId, settings) => {
      const values = {
        hiddenItems: [...settings.hiddenItems],
        barnColor: settings.barnColor,
        updatedAt: new Date(),
      }
      await db
        .insert(userPasture)
        .values({ userId, ...values })
        .onConflictDoUpdate({ target: userPasture.userId, set: values })
    },
  }
}
