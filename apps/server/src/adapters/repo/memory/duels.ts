import { updateRating } from '@bc/game-core'
import { AppError } from '../../../http/errors'
import type { Clock } from '../../../ports/clock'
import type { DuelRow, DuelsRepo } from '../../../ports/repo'
import { copy, defined, type MemoryStore } from './store'

export function memoryDuels(store: MemoryStore, clock: Clock): DuelsRepo {
  const save = (duel: DuelRow): DuelRow => {
    store.duels.set(duel.id, copy(duel))
    return copy(duel)
  }

  return {
    create: async (input) => {
      const existing = input.id === undefined ? undefined : store.duels.get(input.id)
      if (existing) return copy(existing)
      return save({
        ...input,
        id: input.id ?? crypto.randomUUID(),
        winner: null,
        outcome: null,
        ratingDeltaA: null,
        ratingDeltaB: null,
        createdAt: clock.now(),
        finishedAt: null,
        rewardsApplied: false,
      })
    },
    finish: async (id, patch) => {
      const current = store.duels.get(id)
      if (!current) throw new AppError('ERR_NOT_FOUND', 404)
      return save({ ...current, ...defined(patch), finishedAt: patch.finishedAt ?? clock.now() })
    },
    get: async (id) => {
      const found = store.duels.get(id)
      return found ? copy(found) : null
    },
    // Synchronous between the check and the writes, so it is atomic like the SQL transaction.
    applyRewards: async (id, rewards) => {
      const current = store.duels.get(id)
      if (!current) throw new AppError('ERR_NOT_FOUND', 404)
      if (current.rewardsApplied) return false
      for (const r of rewards) {
        const profile = store.profiles.get(r.userId)
        if (!profile) continue
        const u = r.ratingUpdate
        const rating = u ? updateRating(profile.rating, u.opponent, u.outcome).me : profile.rating
        store.profiles.set(r.userId, copy({ ...profile, xp: profile.xp + r.xp, rating }))
      }
      save({ ...current, rewardsApplied: true })
      return true
    },
  }
}
