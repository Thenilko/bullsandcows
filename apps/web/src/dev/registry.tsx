import { lazy, Suspense, type ReactElement } from 'react'
import { LoginErrorScreen, LoginRegisterScreen, LoginScreen, RulesScreen } from './AuthScreens'
import { PrimitivesScreen } from './PrimitivesScreen'
import { SceneIdle, ScenePlay, SceneResult } from './SceneScreens'
import { NewGameScreen, NotebookScreen, PlayCountdownScreen, PlayDesktopNotebookScreen, PlayMidScreen, PlayStartScreen, PlayWinScreen } from './SoloScreens'
import { DesktopShellScreen, MobileShellScreen } from './ShellScreens'

/** The fallback carries `data-gallery-loading` so Playwright can wait for the real screen. */
function lazyScreen(load: () => Promise<() => ReactElement>): () => ReactElement {
  const Screen = lazy(async () => ({ default: await load() }))
  return function LazyScreen() {
    return (
      <Suspense fallback={<p data-gallery-loading="">…</p>}>
        <Screen />
      </Suspense>
    )
  }
}

type DuelScreenName = keyof typeof import('./DuelScreens')
type StatsScreenName = keyof typeof import('./StatsScreens')
type ResetScreenName = keyof typeof import('./ResetScreens')
type ExtrasScreenName = keyof typeof import('./ExtrasScreens')
type PastureScreenName = keyof typeof import('./PastureScreens')
type FarmScreenName = keyof typeof import('./FarmScreens')

/**
 * Duel and reset gallery screens load on demand so they stay out of the gallery entry chunk (Lighthouse
 * measures `play-mid` there; its LCP margin is thin).
 */
const lazyDuel = (name: DuelScreenName) => lazyScreen(async () => (await import('./DuelScreens'))[name])
const lazyStats = (name: StatsScreenName) => lazyScreen(async () => (await import('./StatsScreens'))[name])
const lazyReset = (name: ResetScreenName) => lazyScreen(async () => (await import('./ResetScreens'))[name])
const lazyExtras = (name: ExtrasScreenName) => lazyScreen(async () => (await import('./ExtrasScreens'))[name])
const lazyPasture = (name: PastureScreenName) => lazyScreen(async () => (await import('./PastureScreens'))[name])
const lazyFarm = (name: FarmScreenName) => lazyScreen(async () => (await import('./FarmScreens'))[name])

/** Dev-only screen registry; later tasks add their screens here. */
export const devScreens: Record<string, () => ReactElement> = {
  'scene-idle': SceneIdle,
  'scene-play': ScenePlay,
  'scene-result': SceneResult,
  primitives: PrimitivesScreen,
  'mobile-shell': MobileShellScreen,
  'desktop-shell': DesktopShellScreen,
  login: LoginScreen,
  'login-register': LoginRegisterScreen,
  'login-error': LoginErrorScreen,
  reset: lazyReset('ResetScreen'),
  'reset-expired': lazyReset('ResetExpiredScreen'),
  rules: RulesScreen,
  'new-game': NewGameScreen,
  'play-start': PlayStartScreen,
  'play-countdown': PlayCountdownScreen,
  'play-mid': PlayMidScreen,
  'play-win': PlayWinScreen,
  'result-win': lazyStats('ResultWin'),
  'result-lose': lazyStats('ResultLose'),
  'result-practice': lazyStats('ResultPractice'),
  board: lazyStats('Board'),
  'board-guest': lazyStats('BoardGuest'),
  profile: lazyStats('Profile'),
  'profile-guest': lazyStats('ProfileGuest'),
  notebook: NotebookScreen,
  'play-desktop-notebook': PlayDesktopNotebookScreen,
  'duel-setup': lazyDuel('DuelSetupScreen'),
  'bot-setup': lazyDuel('BotSetupScreen'),
  invite: lazyDuel('InviteScreen'),
  'join-invite': lazyDuel('JoinInviteScreen'),
  queue: lazyDuel('QueueScreen'),
  'queue-suggest': lazyDuel('QueueSuggestScreen'),
  found: lazyDuel('FoundScreen'),
  'hide-secret': lazyDuel('HideSecretScreen'),
  'duel-play-race': lazyDuel('PlayRaceScreen'),
  'duel-play-classic': lazyDuel('PlayClassicScreen'),
  'duel-result-win': lazyDuel('ResultWinScreen'),
  'duel-result-lose': lazyDuel('ResultLoseScreen'),
  'duel-result-draw': lazyDuel('ResultDrawScreen'),
  'share-sheet': lazyExtras('ShareSheetScreen'),
  'share-sheet-duel': lazyExtras('ShareDuelScreen'),
  badges: lazyExtras('BadgesScreen'),
  'badges-guest': lazyExtras('BadgesGuestScreen'),
  'badge-detail': lazyExtras('BadgeDetailScreen'),
  'badge-toast': lazyExtras('BadgeToastScreen'),
  pasture: lazyPasture('PastureGalleryScreen'),
  'pasture-full': lazyPasture('PastureFullScreen'),
  unlock: lazyPasture('UnlockScreen'),
  farm: lazyFarm('FarmScreen'),
  'farm-join': lazyFarm('FarmJoinScreen'),
  'farm-created': lazyFarm('FarmCreatedScreen'),
  'farm-nudge': lazyFarm('FarmNudgeScreen'),
  'farm-settings': lazyFarm('FarmSettingsScreen'),
}
