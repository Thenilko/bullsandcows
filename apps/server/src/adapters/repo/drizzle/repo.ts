import type { RepoHandle } from '../../../ports/repo'
import type { DbHandle } from './client'
import { drizzleDuels } from './duels'
import { drizzleGames } from './games'
import { drizzleProfiles } from './profiles'

/** Postgres-backed repo; mirrors the memory repo method for method. */
export function createDrizzleRepo(handle: DbHandle): RepoHandle {
  return {
    profiles: drizzleProfiles(handle.db),
    games: drizzleGames(handle.db),
    duels: drizzleDuels(handle.db),
    close: () => handle.close(),
  }
}
