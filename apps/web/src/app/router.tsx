import { useTranslation } from 'react-i18next'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { DevScreens } from '../dev/DevScreens'
import { Login } from '../screens/Login'
import { Home } from './Home'
import { RequireAuth } from './RequireAuth'

const devRoutes: RouteObject[] =
  import.meta.env.DEV || import.meta.env.VITE_DEV_SCREENS === '1'
    ? [{ path: '/dev/screens', HydrateFallback: RouteFallback, element: <DevScreens /> }]
    : []

/** Fixed-height placeholder while a lazy route loads, so deep links neither flash blank nor shift layout. */
function RouteFallback() {
  const { t } = useTranslation()
  return (
    <p role="status" style={{ minHeight: '100dvh', margin: 0, padding: 24, fontWeight: 800 }}>
      {t('common.loading')}
    </p>
  )
}

/** Route modules load on demand so the login page ships only what it needs. */
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) => async () => ({
  Component: (await load())[name],
})

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/rules', HydrateFallback: RouteFallback, lazy: page(() => import('../screens/Rules'), 'Rules') },
  {
    element: <RequireAuth />,
    HydrateFallback: RouteFallback,
    children: [
      { path: '/', element: <Home /> },
      { path: '/new', lazy: page(() => import('../screens/NewGame'), 'NewGame') },
      { path: '/play/:gameId', lazy: page(() => import('../screens/Play'), 'Play') },
      { path: '/result/:gameId', lazy: page(() => import('../screens/Result'), 'Result') },
      { path: '/board', lazy: page(() => import('../screens/Leaderboard'), 'Leaderboard') },
      { path: '/profile', lazy: page(() => import('../screens/Profile'), 'Profile') },
    ],
  },
  ...devRoutes,
])
