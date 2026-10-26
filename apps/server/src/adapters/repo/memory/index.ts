import { systemClock, type Clock } from '../../../ports/clock'
import type { RepoHandle } from '../../../ports/repo'
import { memoryBadges } from './badges'
import { memoryDuels } from './duels'
import { memoryGames } from './games'
import { memoryProfiles } from './profiles'
import { memoryPasture } from './pasture'
import { memoryShares } from './shares'
import { createStore, type MemoryStore } from './store'

export function createMemoryRepo(
  clock: Clock = systemClock,
  store: MemoryStore = createStore(),
): RepoHandle {
  return {
    profiles: memoryProfiles(store, clock),
    games: memoryGames(store, clock),
    duels: memoryDuels(store, clock),
    badges: memoryBadges(store),
    shares: memoryShares(store),
    pasture: memoryPasture(store),
    close: async () => undefined,
  }
}

let shared: RepoHandle | null = null

/** One store per isolate, so a `wrangler dev` session keeps its state across requests. */
export function sharedMemoryRepo(): RepoHandle {
  shared ??= createMemoryRepo()
  return shared
}
