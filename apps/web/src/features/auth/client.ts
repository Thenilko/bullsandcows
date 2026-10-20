import { createApi } from '../../lib/api'
import { useSession } from './session'

/** Shared API client: Bearer from the session store; a 401 clears the session. */
export const api = createApi(() => useSession.getState().session?.accessToken ?? null, undefined, {
  onUnauthorized: () => useSession.getState().clear(),
})
