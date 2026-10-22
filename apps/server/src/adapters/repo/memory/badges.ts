import type { BadgesRepo } from '../../../ports/repo'
import type { MemoryStore } from './store'

export function memoryBadges(store: MemoryStore): BadgesRepo {
  return {
    listOf: async (userId) => [...(store.badges.get(userId)?.keys() ?? [])],
    award: async (userId, keys, earnedAt) => {
      const held = store.badges.get(userId) ?? new Map()
      const fresh = keys.filter((k) => !held.has(k)).map((k) => [k, earnedAt] as const)
      if (fresh.length > 0) store.badges.set(userId, new Map([...held, ...fresh]))
    },
  }
}
