import type { AuthResponseDto, MeDto, SessionDto } from '@bc/protocol'
import { createApi } from '../../lib/api'
import { getSupabaseClient } from './SupabaseSession'

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

/**
 * Sets the new password on the recovery session supabase-js picked up from the mail link,
 * then turns that session into an app sign-in (tokens + `GET /api/me`).
 */
export async function completeRecovery(password: string): Promise<AuthResponseDto> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new RecoveryError('reset.unavailable')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new RecoveryError(errorKey(error))
  const { data } = await supabase.auth.getSession()
  const next = data.session
  if (!next) throw new RecoveryError('reset.error.expired')
  const session: SessionDto = {
    accessToken: next.access_token,
    refreshToken: next.refresh_token,
    expiresAt: next.expires_at ?? 0,
    user: { id: next.user.id, isGuest: next.user.is_anonymous === true },
  }
  const me = await createApi(() => session.accessToken).get<MeDto>('/api/me')
  return { session, me }
}
