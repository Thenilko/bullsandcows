import { createBrowserRouter, type RouteObject } from 'react-router'
import { DevScreens } from '../dev/DevScreens'
import { NewGame } from '../screens/NewGame'
import { Play } from '../screens/Play'
import { Leaderboard } from '../screens/Leaderboard'
import { Login } from '../screens/Login'
import { Profile } from '../screens/Profile'
import { Result } from '../screens/Result'
import { Rules } from '../screens/Rules'
import { Home } from './Home'
import { RequireAuth } from './RequireAuth'

const devRoutes: RouteObject[] =
  import.meta.env.DEV || import.meta.env.VITE_DEV_SCREENS === '1'
    ? [{ path: '/dev/screens', element: <DevScreens /> }]
    : []

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/rules', element: <Rules /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/new', element: <NewGame /> },
      { path: '/play/:gameId', element: <Play /> },
      { path: '/result/:gameId', element: <Result /> },
      { path: '/board', element: <Leaderboard /> },
      { path: '/profile', element: <Profile /> },
    ],
  },
  ...devRoutes,
])
