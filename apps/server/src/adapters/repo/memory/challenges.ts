import type { ChallengeRow, ChallengesRepo } from '../../../ports/repo'
import { copy, type MemoryStore } from './store'

const newestFirst = (a: ChallengeRow, b: ChallengeRow): number =>
  b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)

export function memoryChallenges(store: MemoryStore): ChallengesRepo {
  return {
    create: async (input, now) => {
      const row: ChallengeRow = {
        ...input,
        id: crypto.randomUUID(),
        status: 'pending',
        createdAt: now,
        laterAt: null,
      }
      store.challenges.set(row.id, copy(row))
      return copy(row)
    },
    get: async (id) => {
      const found = store.challenges.get(id)
      return found ? copy(found) : null
    },
    incoming: async (toId, now, limit) =>
      [...store.challenges.values()]
        .filter((c) => c.toId === toId && c.status === 'pending' && c.expiresAt > now)
        .sort(newestFirst)
        .flatMap((c) => {
          const from = store.profiles.get(c.fromId)
          if (!from) return []
          return [
            {
              ...copy(c),
              fromUsername: from.username,
              fromXp: from.xp,
              fromAvatarSpecies: from.avatarSpecies,
            },
          ]
        })
        .slice(0, limit),
    cancelBetween: async (fromId, toId) => {
      for (const c of store.challenges.values()) {
        if (c.fromId === fromId && c.toId === toId && c.status === 'pending')
          store.challenges.set(c.id, { ...c, status: 'cancelled' })
      }
    },
    settle: async (id, status) => {
      const found = store.challenges.get(id)
      if (!found || found.status !== 'pending') return false
      store.challenges.set(id, { ...found, status })
      return true
    },
    later: async (id, at, expiresAt) => {
      const found = store.challenges.get(id)
      if (!found || found.status !== 'pending') return false
      store.challenges.set(id, { ...found, laterAt: at, expiresAt })
      return true
    },
  }
}
