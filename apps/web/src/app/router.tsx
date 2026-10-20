import { createBrowserRouter, type RouteObject } from 'react-router'
import { DevScreens } from '../dev/DevScreens'
import { Home } from './Home'

const devRoutes: RouteObject[] =
  import.meta.env.DEV || import.meta.env.VITE_DEV_SCREENS === '1' ? [{ path: '/dev/screens', element: <DevScreens /> }] : []

export const router = createBrowserRouter([{ path: '/', element: <Home /> }, ...devRoutes])
