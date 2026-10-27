import type { PastureRepo } from '../../../ports/repo'
import { copy, type MemoryStore } from './store'

export function memoryPasture(store: MemoryStore): PastureRepo {
  return {
    get: async (userId) => {
      const row = store.pasture.get(userId)
      return row ? copy(row) : null
    },
    save: async (userId, settings) => {
      if (!store.profiles.has(userId)) throw new Error(`user_pasture: no profile ${userId}`)
      store.pasture.set(userId, copy(settings))
    },
  }
}
