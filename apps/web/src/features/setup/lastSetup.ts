import type { Len } from '@bc/game-core'

/** The last settings a game was started with, per setup screen; survives reloads on this browser. */
export const LAST_SETUP_KEY = 'bc.lastSetup'

export type SetupScreen = 'solo' | 'duel' | 'bot'

export interface LastSetup {
  len?: Len
  zero?: boolean
  /** Solo: 'daily' | 'free'. */
  kind?: 'daily' | 'free'
  /** Duel / bot: 'classic' | 'race'. */
  format?: 'classic' | 'race'
  /** Duel: 'quick' | 'friend'. */
  opponent?: 'quick' | 'friend'
  /** Bot: 1–4. */
  level?: 1 | 2 | 3 | 4
}

const oneOf = <T>(v: unknown, allowed: readonly T[]): T | undefined =>
  allowed.includes(v as T) ? (v as T) : undefined

/** Keeps only the fields with valid values (storage is untrusted: old versions, hand edits). */
function clean(raw: unknown): LastSetup {
  if (typeof raw !== 'object' || raw === null) return {}
  const r = raw as Record<string, unknown>
  const out: LastSetup = {
    len: oneOf(r.len, [3, 4, 5] as const),
    zero: typeof r.zero === 'boolean' ? r.zero : undefined,
    kind: oneOf(r.kind, ['daily', 'free'] as const),
    format: oneOf(r.format, ['classic', 'race'] as const),
    opponent: oneOf(r.opponent, ['quick', 'friend'] as const),
    level: oneOf(r.level, [1, 2, 3, 4] as const),
  }
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as LastSetup
}

function readAll(): Partial<Record<SetupScreen, unknown>> {
  try {
    const raw = window.localStorage.getItem(LAST_SETUP_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Partial<Record<SetupScreen, unknown>>)
      : {}
  } catch {
    return {}
  }
}

/** What this screen was last started with; empty when nothing is stored or storage is blocked. */
export function loadLastSetup(screen: SetupScreen): LastSetup {
  return clean(readAll()[screen])
}

/** Remembers the settings a game was just started with. */
export function saveLastSetup(screen: SetupScreen, setup: LastSetup): void {
  try {
    window.localStorage.setItem(
      LAST_SETUP_KEY,
      JSON.stringify({ ...readAll(), [screen]: clean(setup) }),
    )
  } catch {
    // Storage blocked (private mode): the screen just opens with its defaults next time.
  }
}
