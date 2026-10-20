import type { SupabaseClient } from '@supabase/supabase-js'
import type { SessionDto } from '@bc/protocol'
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
