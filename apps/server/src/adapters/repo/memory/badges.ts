import type { BadgesRepo, BadgeState } from '../../../ports/repo'
import { copy, type MemoryStore } from './store'

/** Members holding „Пионер“ (a deleted profile's badges are gone with it). */
function pioneers(store: MemoryStore): number {
  let n = 0
  for (const [userId, held] of store.badges) {
    const tier = held.get('pioneer')?.tier ?? 0
    if (tier > 0 && store.profiles.get(userId)?.isGuest === false) n += 1
  }
  return n
}

export function memoryBadges(store: MemoryStore): BadgesRepo {
  return {
    listOf: async (userId) => copy([...(store.badges.get(userId)?.values() ?? [])]),
    save: async (userId, rows) => {
      if (rows.length === 0) return
      const held = store.badges.get(userId) ?? new Map()
      store.badges.set(userId, new Map([...held, ...rows.map((r) => [r.key, copy(r)] as const)]))
    },
    // Check and write in one synchronous step: concurrent calls cannot interleave here.
    grantPioneer: async (userId, { now, limit, xp }) => {
      const profile = store.profiles.get(userId)
      const held = store.badges.get(userId) ?? new Map<BadgeState['key'], BadgeState>()
      if (!profile || profile.isGuest || held.has('pioneer') || pioneers(store) >= limit) {
        return false
      }
      const row: BadgeState = { key: 'pioneer', tier: 1, progress: 1, earnedAt: now }
      store.badges.set(userId, new Map([...held, ['pioneer', row] as const]))
      store.profiles.set(userId, { ...profile, xp: profile.xp + xp })
      return true
    },
    pioneerCount: async () => pioneers(store),
  }
}
