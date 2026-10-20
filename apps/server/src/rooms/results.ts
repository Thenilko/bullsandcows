import type { RepoHandle } from '../ports/repo'
import { recordResult, resultIds } from './persist'
import { PERSIST_MAX_ATTEMPTS, retryDelay, type PendingResult, type RoomState } from './state'

/** Storage keys of claimed, not yet written results: `pending:<duelId>`. */
export const PENDING_PREFIX = 'pending:'

export const pendingKey = (p: PendingResult): string => `${PENDING_PREFIX}${p.ids.duelId}`

const errorText = (err: unknown): string => (err instanceof Error ? err.message : 'unknown error')

/** The record to store when a match ends; abandoned matches record nothing. */
export function claimResult(st: RoomState, now: number): PendingResult | null {
  const { match } = st
  if (match.outcome?.reason === 'abandoned') return null
  return {
    match,
    secrets: st.secrets,
    ids: resultIds(match),
    inviteCode: st.meta.inviteCode,
    attempts: 0,
    retryAt: now + retryDelay(1),
  }
}

async function write(openRepo: () => RepoHandle, p: PendingResult): Promise<void> {
  const repo = openRepo()
  try {
    await recordResult(repo, p)
  } finally {
    await repo.close()
  }
}

/**
 * One write of a claimed result. Success deletes its entry; a failure is retried with
 * backoff, and after `PERSIST_MAX_ATTEMPTS` the entry is dropped. Writes are idempotent (fixed
 * row ids, rewards credited once per duel), so an overlapping retry is harmless.
 */
export async function attemptWrite(
  storage: DurableObjectStorage,
  openRepo: () => RepoHandle,
  p: PendingResult,
  now: number,
): Promise<void> {
  const key = pendingKey(p)
  try {
    await write(openRepo, p)
    await storage.delete(key)
  } catch (err) {
    const attempts = p.attempts + 1
    if (attempts >= PERSIST_MAX_ATTEMPTS) {
      console.error(
        `duel ${p.ids.duelId}: result dropped after ${attempts} attempts: ${errorText(err)}`,
      )
      await storage.delete(key)
      return
    }
    if (attempts === 1) {
      console.error(`duel ${p.ids.duelId}: result not recorded, retrying: ${errorText(err)}`)
    }
    await storage.put(key, { ...p, attempts, retryAt: now + retryDelay(attempts) })
  }
}

const pendingResults = async (storage: DurableObjectStorage): Promise<PendingResult[]> => [
  ...(await storage.list<PendingResult>({ prefix: PENDING_PREFIX })).values(),
]

/** Retries every claimed result whose time has come. */
export async function retryDue(
  storage: DurableObjectStorage,
  openRepo: () => RepoHandle,
  now: number,
): Promise<void> {
  for (const p of await pendingResults(storage)) {
    if (p.retryAt <= now) await attemptWrite(storage, openRepo, p, now)
  }
}

/** When the alarm must next retry a result, or null. */
export async function earliestRetry(storage: DurableObjectStorage): Promise<number | null> {
  const times = (await pendingResults(storage)).map((p) => p.retryAt)
  return times.length > 0 ? Math.min(...times) : null
}
