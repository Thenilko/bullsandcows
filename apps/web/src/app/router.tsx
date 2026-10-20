import { createBrowserRouter, type RouteObject } from 'react-router'
import { DevScreens } from '../dev/DevScreens'
import { Login } from '../screens/Login'
import { Home } from './Home'
import { RequireAuth } from './RequireAuth'

const devRoutes: RouteObject[] =
  import.meta.env.DEV || import.meta.env.VITE_DEV_SCREENS === '1'
    ? [{ path: '/dev/screens', element: <DevScreens /> }]
    : []

/** Route modules load on demand so the login page ships only what it needs. */
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) => async () => ({
  Component: (await load())[name],
})

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/rules', lazy: page(() => import('../screens/Rules'), 'Rules') },
  {
    element: <RequireAuth />,
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
