import type { AuthResponseDto, MeDto, SessionDto } from '@bc/protocol'
import { createApi } from '../../lib/api'
import { useSession } from './session'
import { getSupabaseClient, recoveryUserId } from './SupabaseSession'

/** i18n keys a failed recovery can surface. */
export type RecoveryErrorKey =
  | 'reset.unavailable'
  | 'reset.error.same'
  | 'reset.error.weak'
  | 'reset.error.expired'
  | 'reset.error.failed'

export class RecoveryError extends Error {
  constructor(readonly key: RecoveryErrorKey) {
    super(key)
    this.name = 'RecoveryError'
  }
}

interface SupabaseAuthError {
  code?: string
  message?: string
  status?: number
}

function errorKey(e: SupabaseAuthError): RecoveryErrorKey {
  if (e.code === 'same_password') return 'reset.error.same'
  if (e.code === 'weak_password') return 'reset.error.weak'
  const missing = e.code === 'session_not_found' || /session/i.test(e.message ?? '')
  return missing || e.status === 401 || e.status === 403 ? 'reset.error.expired' : 'reset.error.failed'
}

type Supabase = NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>

/** The active supabase session, only if it is the one the recovery link signed in. */
async function recoverySession(supabase: Supabase) {
  const { data } = await supabase.auth.getSession()
  const active = data.session
  const expected = recoveryUserId()
  if (!active || !expected || active.user.id !== expected) throw new RecoveryError('reset.error.expired')
  return active
}

/**
 * Sets the new password on the recovery session supabase-js picked up from the mail link
 * (never on another account's session), then signs that user in: tokens + `GET /api/me`
 * into the store, recovery flag cleared.
 */
export async function completeRecovery(password: string): Promise<AuthResponseDto> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new RecoveryError('reset.unavailable')
  await recoverySession(supabase)
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new RecoveryError(errorKey(error))
  const next = await recoverySession(supabase)
  const session: SessionDto = {
    accessToken: next.access_token,
    refreshToken: next.refresh_token,
    expiresAt: next.expires_at ?? 0,
    user: { id: next.user.id, isGuest: next.user.is_anonymous === true },
  }
  const me = await createApi(() => session.accessToken).get<MeDto>('/api/me')
  const res = { session, me }
  useSession.getState().setAuth(res)
  useSession.getState().setRecoverySession(false)
  return res
}
