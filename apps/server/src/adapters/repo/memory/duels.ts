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
    create: async (input) =>
      save({
        ...input,
        id: crypto.randomUUID(),
        winner: null,
        outcome: null,
        ratingDeltaA: null,
        ratingDeltaB: null,
        createdAt: clock.now(),
        finishedAt: null,
      }),
    finish: async (id, patch) => {
      const current = store.duels.get(id)
      if (!current) throw new AppError('ERR_NOT_FOUND', 404)
      return save({ ...current, ...defined(patch), finishedAt: patch.finishedAt ?? clock.now() })
    },
    get: async (id) => {
      const found = store.duels.get(id)
      return found ? copy(found) : null
    },
  }
}
