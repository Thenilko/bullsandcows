import type { Env } from '../../env'
import type { RepoHandle } from '../../ports/repo'
import { createDb } from './drizzle/client'
import { createDrizzleRepo } from './drizzle/repo'
import { sharedMemoryRepo } from './memory'

/** Memory: one store per isolate. Postgres: a fresh client per call (i.e. per request). */
export function makeRepo(env: Env): RepoHandle {
  if (env.REPO_MODE === 'memory') return sharedMemoryRepo()
  if (!env.HYPERDRIVE) throw new Error('HYPERDRIVE binding is required for REPO_MODE "postgres"')
  return createDrizzleRepo(createDb(env.HYPERDRIVE))
}
