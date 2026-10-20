import { createBrowserRouter, type RouteObject } from 'react-router'
import { DevScreens } from '../dev/DevScreens'
import { Login } from '../screens/Login'
import { Rules } from '../screens/Rules'
import { DuelRoom } from '../screens/duel/DuelRoom'
import { DuelSetup } from '../screens/duel/DuelSetup'
import { Invite } from '../screens/duel/Invite'
import { JoinInvite } from '../screens/duel/JoinInvite'
import { Queue } from '../screens/duel/Queue'
import { Home } from './Home'
import { RequireAuth } from './RequireAuth'

const devRoutes: RouteObject[] =
  import.meta.env.DEV || import.meta.env.VITE_DEV_SCREENS === '1' ? [{ path: '/dev/screens', element: <DevScreens /> }] : []

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/rules', element: <Rules /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/duel/new', element: <DuelSetup mode="duel" /> },
      { path: '/bot/new', element: <DuelSetup mode="bot" /> },
      { path: '/duel/queue', element: <Queue /> },
      { path: '/duel/invite/:code', element: <Invite /> },
      { path: '/d/:code', element: <JoinInvite /> },
      { path: '/duel/:roomId', element: <DuelRoom /> },
      { path: '/duel/:roomId/result', element: <DuelRoom view="result" /> },
    ],
  },
  ...devRoutes,
])
