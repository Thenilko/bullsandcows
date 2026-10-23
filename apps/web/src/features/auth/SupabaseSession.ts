import type { SupabaseClient } from '@supabase/supabase-js'
import type { SessionDto } from '@bc/protocol'
import { ApiError, type RefreshResult } from '../../lib/api'
import { useSession } from './session'

export function isSupabaseMode(): boolean {
  const mode = import.meta.env.VITE_AUTH_MODE as string | undefined
  if (mode) return mode === 'supabase'
  return Boolean(import.meta.env.VITE_SUPABASE_URL)
}

let client: SupabaseClient | null = null

/** Loaded lazily so fake-auth and signed-out visits never download supabase-js. */
export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseMode()) return null
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) return null
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: true } })
  }
  return client
}

/** Hands the server-issued tokens to supabase-js so it refreshes them before they expire. */
export async function adoptSession(session: SessionDto): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) return
  try {
    await supabase.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken })
  } catch {
    // refresh is best effort; a 401 will clear the session
  }
}

/**
 * Supabase mode: an anonymous sign-in straight from the browser, so Supabase's per-IP limits
 * count the player's address, not the Worker's. Null in fake mode (the server signs guests in).
 */
export async function signInGuestOnClient(): Promise<SessionDto | null> {
  const supabase = await getSupabaseClient()
  if (!supabase) return null
  let result: Awaited<ReturnType<SupabaseClient['auth']['signInAnonymously']>>
  try {
    result = await supabase.auth.signInAnonymously()
  } catch {
    throw new ApiError('ERR_INTERNAL', 0)
  }
  const { data, error } = result
  if (error || !data.session) {
    const status = error?.status ?? 0
    throw new ApiError(status === 429 ? 'ERR_RATE_LIMIT' : 'ERR_INTERNAL', status)
  }
  const s = data.session
  return {
    accessToken: s.access_token,
    refreshToken: s.refresh_token,
    expiresAt: s.expires_at ?? 0,
    user: { id: s.user.id, isGuest: true },
  }
}

/** Renew this long before `expiresAt`, so a request never leaves with a token about to lapse. */
const EXPIRY_MARGIN_S = 60

/** Supabase's own network and 5xx failures: the refresh token may still be good. */
const isRetryable = (error: { name?: string; status?: number } | null): boolean =>
  error?.name === 'AuthRetryableFetchError' || error?.status === 0 || (error?.status ?? 0) >= 500

async function refreshOnce(): Promise<RefreshResult> {
  const supabase = await getSupabaseClient()
  const current = useSession.getState().session
  if (!supabase || !current) return 'invalid'
  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: current.refreshToken })
    const next = data.session
    if (error || !next) return isRetryable(error) ? 'unavailable' : 'invalid'
    // The answer must belong to the stored user; anything else ends nothing but is not used.
    if (next.user.id !== current.user.id) return 'invalid'
    useSession.getState().setTokens({
      accessToken: next.access_token,
      refreshToken: next.refresh_token,
      expiresAt: next.expires_at ?? 0,
    })
    return 'refreshed'
  } catch {
    return 'unavailable'
  }
}

let refreshing: Promise<RefreshResult> | null = null

/** New tokens from the stored refresh token; concurrent callers share one call. Fake mode: `invalid`. */
export function refreshTokens(): Promise<RefreshResult> {
  refreshing ??= refreshOnce().finally(() => {
    refreshing = null
  })
  return refreshing
}

/** Before a request: renews the access token when it expires within a minute (Supabase mode only). */
export async function ensureFreshToken(nowMs: number = Date.now()): Promise<void> {
  if (!isSupabaseMode()) return
  const session = useSession.getState().session
  if (!session || session.expiresAt - nowMs / 1000 > EXPIRY_MARGIN_S) return
  await refreshTokens()
}

export async function signOutSupabase(): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) return
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // already signed out locally
  }
}

let started = false
let recoveryUser: string | null = null

/** The user of the recovery session supabase-js took from the mail link, once reported. */
export function recoveryUserId(): string | null {
  return recoveryUser
}

/** True when the address carries a password-recovery link (implicit flow hash). */
export function isRecoveryUrl(): boolean {
  return typeof window !== 'undefined' && /(^|[#&])type=recovery(&|$)/.test(window.location.hash)
}

type SyncEvent = Parameters<Parameters<SupabaseClient['auth']['onAuthStateChange']>[0]>
const TOKEN_EVENTS: readonly string[] = ['TOKEN_REFRESHED', 'SIGNED_IN', 'USER_UPDATED']

const userIdOf = (s: SyncEvent[1]): string | null => (s as { user?: { id?: string } } | null)?.user?.id ?? null

/** Applies one supabase-js auth event to the store. */
function onAuthEvent(event: SyncEvent[0], next: SyncEvent[1]): void {
  const store = useSession.getState()
  if (event === 'SIGNED_OUT') {
    store.clear()
    return
  }
  if (event === 'PASSWORD_RECOVERY') {
    recoveryUser = userIdOf(next)
    // The link signs in its own user; a stored session of anyone else must not stay active.
    if (store.session && store.session.user.id !== recoveryUser) store.clear()
    store.setRecoverySession(true)
    return
  }
  if (!TOKEN_EVENTS.includes(event) || !next) return
  // Never graft another account's tokens onto the stored session.
  const ownerId = userIdOf(next)
  if (ownerId && store.session && ownerId !== store.session.user.id) return
  store.setTokens({ accessToken: next.access_token, refreshToken: next.refresh_token, expiresAt: next.expires_at ?? 0 })
}

/** Subscribes once: keeps the store in step with supabase-js token refreshes and recovery links. */
export async function startSupabaseSync(): Promise<void> {
  if (started) return
  // Read before supabase-js consumes the hash: a recovery link must keep its own session.
  const recovering = isRecoveryUrl()
  const supabase = await getSupabaseClient()
  if (!supabase || started) return
  started = true
  supabase.auth.onAuthStateChange(onAuthEvent)
  const current = useSession.getState().session
  if (recovering) {
    if (current) useSession.getState().clear()
    return
  }
  if (current) await adoptSession(current)
}
