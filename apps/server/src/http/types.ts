import type { Env } from '../env'
import type { RoomClient } from '../duel/roomClient'
import type { AuthPort, AuthUser } from '../ports/auth'
import type { Clock } from '../ports/clock'
import type { Repo } from '../ports/repo'

export interface AppDeps {
  readonly env: Env
  readonly repo: Repo
  readonly auth: AuthPort
  readonly clock: Clock
  /** Duel rooms; defaults to the `DUEL` namespace. Tests inject an in-memory fake. */
  readonly rooms?: RoomClient
}

export type AppEnv = {
  Bindings: Env
  Variables: { user: AuthUser; deps: AppDeps }
}
