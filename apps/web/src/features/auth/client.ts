import { createApi } from '../../lib/api'
import { useSession } from './session'
import { ensureFreshToken, refreshTokens } from './SupabaseSession'

/**
 * Shared API client: Bearer from the session store. A token about to expire is renewed first;
 * a 401 gets one refresh and retry, and only a session that cannot be renewed is cleared.
 */
export const api = createApi(() => useSession.getState().session?.accessToken ?? null, undefined, {
  onUnauthorized: () => useSession.getState().clear(),
  beforeRequest: () => ensureFreshToken(),
  refresh: () => refreshTokens(),
})
