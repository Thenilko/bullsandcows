import { createBrowserRouter, type RouteObject } from 'react-router'
import { DevScreens } from '../dev/DevScreens'
import { Login } from '../screens/Login'
import { Rules } from '../screens/Rules'
import { Home } from './Home'
import { RequireAuth } from './RequireAuth'

const devRoutes: RouteObject[] =
  import.meta.env.DEV || import.meta.env.VITE_DEV_SCREENS === '1' ? [{ path: '/dev/screens', element: <DevScreens /> }] : []

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/rules', element: <Rules /> },
  { element: <RequireAuth />, children: [{ path: '/', element: <Home /> }] },
  ...devRoutes,
])
