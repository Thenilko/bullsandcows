import type { RepoHandle } from '../../../ports/repo'
import { drizzleAdmin } from './admin'
import { drizzleBadges } from './badges'
import type { DbHandle } from './client'
import { drizzleDuels } from './duels'
import { drizzleFarms } from './farms'
import { drizzleGames } from './games'
import { drizzleProfiles } from './profiles'
import { drizzlePasture } from './pasture'
import { drizzleShares } from './shares'
import { drizzleWeekly } from './weekly'

/** Postgres-backed repo; mirrors the memory repo method for method. */
export function createDrizzleRepo(handle: DbHandle): RepoHandle {
  return {
    profiles: drizzleProfiles(handle.db),
    games: drizzleGames(handle.db),
    duels: drizzleDuels(handle.db),
    badges: drizzleBadges(handle.db),
    shares: drizzleShares(handle.db),
    pasture: drizzlePasture(handle.db),
    farms: drizzleFarms(handle.db),
    weekly: drizzleWeekly(handle.db),
    admin: drizzleAdmin(handle.db),
    close: () => handle.close(),
  }
}
