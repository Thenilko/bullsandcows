import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '../features/auth/session'

export const RETURN_TO_KEY = 'bc.returnTo'

/** Layout route: signed-out visitors go to /login and come back afterwards. */
export function RequireAuth() {
  const authed = useSession((s) => s.session !== null)
  const loc = useLocation()
  if (authed) return <Outlet />
  try {
    sessionStorage.setItem(RETURN_TO_KEY, loc.pathname + loc.search)
  } catch {
    // returnTo is a convenience only
  }
  return <Navigate to="/login" replace />
}
