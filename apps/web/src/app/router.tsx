import { useTranslation } from 'react-i18next'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { DevScreens } from '../dev/DevScreens'
import { Login } from '../screens/Login'
import { Home } from './Home'
import { RequireAuth } from './RequireAuth'
import { RouteError } from './RouteError'

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

/** Lazy duel routes whose component needs a fixed prop (the route itself decides the mode/view). */
const duelSetup = (mode: 'duel' | 'bot') => async () => {
  const { DuelSetup } = await import('../screens/duel/DuelSetup')
  return { element: <DuelSetup mode={mode} /> }
}
const duelRoom = (view: 'play' | 'result') => async () => {
  const { DuelRoom } = await import('../screens/duel/DuelRoom')
  return { element: <DuelRoom view={view} /> }
}

type InfoPageName = 'PrivacyPage' | 'TermsPage' | 'LegalPage' | 'ChangelogPage' | 'SupportPage' | 'StoryPage'

/** Public info pages linked from the footer; readable without an account. */
const infoRoutes: RouteObject[] = (
  [
    ['/privacy', 'PrivacyPage'],
    ['/terms', 'TermsPage'],
    ['/legal', 'LegalPage'],
    ['/changelog', 'ChangelogPage'],
    ['/support', 'SupportPage'],
    ['/story', 'StoryPage'],
  ] as const satisfies readonly (readonly [string, InfoPageName])[]
).map(([path, name]) => ({ path, HydrateFallback: RouteFallback, lazy: page(() => import('../features/legal/pages'), name) }))

const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  { path: '/rules', HydrateFallback: RouteFallback, lazy: page(() => import('../screens/Rules'), 'Rules') },
  ...infoRoutes,
  { path: '/reset', HydrateFallback: RouteFallback, lazy: page(() => import('../screens/ResetPassword'), 'ResetPassword') },
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
      { path: '/profile/pasture', lazy: page(() => import('../screens/Pasture'), 'Pasture') },
      { path: '/admin', lazy: page(() => import('../screens/Admin'), 'Admin') },
      { path: '/farm', lazy: page(() => import('../screens/Farm'), 'Farm') },
      { path: '/farm/settings', lazy: page(() => import('../screens/FarmSettings'), 'FarmSettings') },
      { path: '/ferma/:code', lazy: page(() => import('../screens/Farm'), 'Farm') },
      { path: '/today', lazy: page(() => import('../screens/Today'), 'Today') },
      { path: '/weekly', lazy: page(() => import('../screens/Weekly'), 'Weekly') },
      { path: '/weekly/play', lazy: page(() => import('../screens/WeeklyPlay'), 'WeeklyPlay') },
      { path: '/weekly/board/:week', lazy: page(() => import('../screens/WeeklyBoard'), 'WeeklyBoard') },
      { path: '/duel/new', lazy: duelSetup('duel') },
      { path: '/bot/new', lazy: duelSetup('bot') },
      { path: '/duel/queue', lazy: page(() => import('../screens/duel/Queue'), 'Queue') },
      { path: '/duel/invite/:code', lazy: page(() => import('../screens/duel/Invite'), 'Invite') },
      { path: '/d/:code', lazy: page(() => import('../screens/duel/JoinInvite'), 'JoinInvite') },
      { path: '/duel/:roomId', lazy: duelRoom('play') },
      { path: '/duel/:roomId/result', lazy: duelRoom('result') },
    ],
  },
  ...devRoutes,
]

/** A pathless root so one error page covers every route, including a lazy chunk that fails to load. */
export const router = createBrowserRouter([{ errorElement: <RouteError />, children: routes }])
