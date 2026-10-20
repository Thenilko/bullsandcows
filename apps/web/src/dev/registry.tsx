import type { ReactElement } from 'react'
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
}
