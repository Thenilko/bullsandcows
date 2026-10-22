import type { BadgesRepo } from '../../../ports/repo'
import { copy, type MemoryStore } from './store'

export function memoryBadges(store: MemoryStore): BadgesRepo {
  return {
    listOf: async (userId) => copy([...(store.badges.get(userId)?.values() ?? [])]),
    save: async (userId, rows) => {
      if (rows.length === 0) return
      const held = store.badges.get(userId) ?? new Map()
      store.badges.set(userId, new Map([...held, ...rows.map((r) => [r.key, copy(r)] as const)]))
    },
  }
}
