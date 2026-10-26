import type { RepoHandle } from '../../../ports/repo'
import { drizzleBadges } from './badges'
import type { DbHandle } from './client'
import { drizzleDuels } from './duels'
import { drizzleGames } from './games'
import { drizzleProfiles } from './profiles'
import { drizzleShares } from './shares'

/** Postgres-backed repo; mirrors the memory repo method for method. */
export function createDrizzleRepo(handle: DbHandle): RepoHandle {
  return {
    profiles: drizzleProfiles(handle.db),
    games: drizzleGames(handle.db),
    duels: drizzleDuels(handle.db),
    badges: drizzleBadges(handle.db),
    shares: drizzleShares(handle.db),
    close: () => handle.close(),
  }
}
