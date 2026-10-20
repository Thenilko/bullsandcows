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
async function getClient(): Promise<SupabaseClient | null> {
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
  const supabase = await getClient()
  if (!supabase) return
  try {
    await supabase.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken })
  } catch {
    // refresh is best effort; a 401 will clear the session
  }
}

export async function signOutSupabase(): Promise<void> {
  const supabase = await getClient()
  if (!supabase) return
  try {
    await supabase.auth.signOut()
  } catch {
    // already signed out locally
  }
}

let started = false

/** Subscribes once: keeps the store in step with supabase-js token refreshes. */
export async function startSupabaseSync(): Promise<void> {
  if (started) return
  const supabase = await getClient()
  if (!supabase || started) return
  started = true
  supabase.auth.onAuthStateChange((event, next) => {
    if (event === 'SIGNED_OUT') {
      useSession.getState().clear()
      return
    }
    if (event === 'TOKEN_REFRESHED' && next) {
      useSession.getState().setTokens({
        accessToken: next.access_token,
        refreshToken: next.refresh_token,
        expiresAt: next.expires_at ?? 0,
      })
    }
  })
  const current = useSession.getState().session
  if (current) await adoptSession(current)
}
