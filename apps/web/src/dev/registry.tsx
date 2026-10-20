import type { ReactElement } from 'react'
import { PrimitivesScreen } from './PrimitivesScreen'
import { SceneIdle, ScenePlay, SceneResult } from './SceneScreens'
import { DesktopShellScreen, MobileShellScreen } from './ShellScreens'

/** Dev-only screen registry; later tasks add their screens here. */
export const devScreens: Record<string, () => ReactElement> = {
  'scene-idle': SceneIdle,
  'scene-play': ScenePlay,
  'scene-result': SceneResult,
  primitives: PrimitivesScreen,
  'mobile-shell': MobileShellScreen,
  'desktop-shell': DesktopShellScreen,
}
