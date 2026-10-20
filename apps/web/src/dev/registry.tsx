import { lazy, Suspense, type ReactElement } from 'react'
import { LoginErrorScreen, LoginRegisterScreen, LoginScreen, RulesScreen } from './AuthScreens'
import { PrimitivesScreen } from './PrimitivesScreen'
import {
  Board,
  BoardGuest,
  Profile,
  ProfileGuest,
  ResultLose,
  ResultPractice,
  ResultWin,
} from './StatsScreens'
import { SceneIdle, ScenePlay, SceneResult } from './SceneScreens'
import { NewGameScreen, NotebookScreen, PlayDesktopNotebookScreen, PlayMidScreen, PlayStartScreen, PlayWinScreen } from './SoloScreens'
import { DesktopShellScreen, MobileShellScreen } from './ShellScreens'

type DuelScreenName = keyof typeof import('./DuelScreens')

/**
 * Duel gallery screens load on demand so they stay out of the gallery entry chunk (Lighthouse measures
 * `play-mid` there). The fallback carries `data-gallery-loading` so Playwright can wait for the real screen.
 */
function lazyDuel(name: DuelScreenName): () => ReactElement {
  const Screen = lazy(async () => ({ default: (await import('./DuelScreens'))[name] }))
  return function LazyDuelScreen() {
    return (
      <Suspense fallback={<p data-gallery-loading="">…</p>}>
        <Screen />
      </Suspense>
    )
  }
}

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
  rules: RulesScreen,
  'new-game': NewGameScreen,
  'play-start': PlayStartScreen,
  'play-mid': PlayMidScreen,
  'play-win': PlayWinScreen,
  'result-win': ResultWin,
  'result-lose': ResultLose,
  'result-practice': ResultPractice,
  board: Board,
  'board-guest': BoardGuest,
  profile: Profile,
  'profile-guest': ProfileGuest,
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
}
