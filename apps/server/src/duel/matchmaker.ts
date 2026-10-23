import type { Len } from '@bc/game-core'

export type DuelFormat = 'race' | 'classic'

export interface QueueEntry {
  readonly userId: string
  readonly username: string
  readonly level: number
  /** Glicko-2 display number. */
  readonly rating: number
  readonly len: Len
  readonly zero: boolean
  readonly format: DuelFormat
  readonly joinedAt: number
}

export interface QueueState {
  readonly entries: readonly QueueEntry[]
}

export const WINDOW_BASE = 75
export const WINDOW_STEP = 75
export const WINDOW_STEP_MS = 5000
export const WINDOW_MAX = 525
/** After this wait the client offers an invite link instead. */
export const SUGGEST_INVITE_MS = 20_000

/** Rating gap tolerated after waiting `waitedMs`: widens by one step every 5 s, capped. */
export function windowFor(waitedMs: number): number {
  const steps = Math.floor(Math.max(0, waitedMs) / WINDOW_STEP_MS)
  return Math.min(WINDOW_MAX, WINDOW_BASE + steps * WINDOW_STEP)
}

/** Adds an entry; a user already queued is replaced (a fresh join resets their wait). */
export function enqueue(q: QueueState, e: QueueEntry): QueueState {
  return { entries: [...q.entries.filter((x) => x.userId !== e.userId), e] }
}

export function dequeue(q: QueueState, userId: string): QueueState {
  return { entries: q.entries.filter((x) => x.userId !== userId) }
}

const sameSettings = (a: QueueEntry, b: QueueEntry): boolean =>
  a.len === b.len && a.zero === b.zero && a.format === b.format

function compatible(a: QueueEntry, b: QueueEntry, now: number): boolean {
  if (a.userId === b.userId || !sameSettings(a, b)) return false
  const window = Math.min(windowFor(now - a.joinedAt), windowFor(now - b.joinedAt))
  return Math.abs(a.rating - b.rating) <= window
}

/** Pairs the longest-waiting entries first; unpaired entries stay queued. */
export function tick(
  q: QueueState,
  now: number,
): { queue: QueueState; pairs: readonly [QueueEntry, QueueEntry][] } {
  const byWait = [...q.entries].sort((a, b) => a.joinedAt - b.joinedAt)
  const taken = new Set<string>()
  const pairs: [QueueEntry, QueueEntry][] = []
  for (const a of byWait) {
    if (taken.has(a.userId)) continue
    const partner = byWait.find((b) => !taken.has(b.userId) && compatible(a, b, now))
    if (!partner) continue
    taken.add(a.userId)
    taken.add(partner.userId)
    pairs.push([a, partner])
  }
  return { queue: { entries: q.entries.filter((e) => !taken.has(e.userId)) }, pairs }
}
