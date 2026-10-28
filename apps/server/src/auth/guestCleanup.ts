import type { AuthPort } from '../ports/auth'
import type { RepoHandle } from '../ports/repo'

/** Guests who started no game for this long are deleted (privacy policy: „след 12 месеца“). */
export const GUEST_RETENTION_MS = 365 * 24 * 60 * 60 * 1000
/** Per daily run, so one run stays short; a backlog clears over the following days. */
export const GUEST_CLEANUP_BATCH = 200

export interface GuestCleanupResult {
  readonly deleted: number
  /** Auth users that could not be removed; their profile is already gone, so a later sign-in starts afresh. */
  readonly authFailures: number
}

/** Deletes inactive guest profiles (with their games) and then their anonymous auth users. */
export async function purgeInactiveGuests(
  repo: RepoHandle,
  auth: AuthPort,
  now: number,
): Promise<GuestCleanupResult> {
  const ids = await repo.profiles.deleteInactiveGuests(
    now - GUEST_RETENTION_MS,
    GUEST_CLEANUP_BATCH,
  )
  const results = await Promise.allSettled(ids.map((id) => auth.deleteUser(id)))
  const authFailures = results.filter((r) => r.status === 'rejected').length
  return { deleted: ids.length, authFailures }
}
