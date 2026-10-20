import type { ReactNode } from 'react'
import type { PastureSceneProps } from '../../components/scene'

export type SceneProps = Omit<PastureSceneProps, 'className' | 'label'>

export interface ShellProps {
  scene: SceneProps
  children: ReactNode
  /** Desktop only: puts the scene in the narrow second column (non-play screens). */
  sceneSide?: boolean
  /** Hides the tab bar (mobile) and the nav items (desktop); used while signed out. */
  bare?: boolean
}

export const TABS = [
  { to: '/', key: 'nav.play', end: true },
  { to: '/board', key: 'nav.board', end: false },
  { to: '/profile', key: 'nav.profile', end: false },
  { to: '/rules', key: 'nav.rules', end: false },
] as const
