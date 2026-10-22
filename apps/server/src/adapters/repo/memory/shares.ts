import type { SharesRepo } from '../../../ports/repo'
import type { MemoryStore } from './store'

const keyOf = (userId: string, gameId: string): string => `${userId}|${gameId}`

export function memoryShares(store: MemoryStore): SharesRepo {
  return {
    add: async (share) => {
      const key = keyOf(share.userId, share.gameId)
      if (store.shares.has(key)) return false
      store.shares.set(key, { ...share, id: crypto.randomUUID() })
      return true
    },
    countOf: async (userId) => [...store.shares.values()].filter((s) => s.userId === userId).length,
  }
}
