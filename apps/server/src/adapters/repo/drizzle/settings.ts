import { eq } from 'drizzle-orm'
import type { SettingsRepo } from '../../../ports/repo'
import type { Db } from './client'
import { appSettings } from './schema'

export function drizzleSettings(db: Db): SettingsRepo {
  return {
    get: async (key) => {
      const [row] = await db
        .select({ value: appSettings.value })
        .from(appSettings)
        .where(eq(appSettings.key, key))
      return row ? row.value : null
    },
    put: async (key, value) => {
      const set = { value, updatedAt: new Date() }
      await db
        .insert(appSettings)
        .values({ key, ...set })
        .onConflictDoUpdate({ target: appSettings.key, set })
    },
    remove: async (key) => {
      await db.delete(appSettings).where(eq(appSettings.key, key))
    },
  }
}
