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
  /** Mobile only: top offset of the panel in px (the play screens use 356 to show the whole scene). */
  panelTop?: number
  /** Mobile only: CSS padding of the panel (play uses the prototype's 14px 16px 12px). */
  panelPadding?: string
  /** Overlay rendered on top of the scene (HUD chips), as in the prototypes. */
  hud?: ReactNode
}

export const TABS = [
  { to: '/', key: 'nav.play', end: true },
  { to: '/board', key: 'nav.board', end: false },
  { to: '/profile', key: 'nav.profile', end: false },
  { to: '/rules', key: 'nav.rules', end: false },
] as const

/** Route prefixes that belong to the "Игра" tab, so it stays highlighted on them. */
const PLAY_PREFIXES = ['/new', '/play', '/result'] as const

export function isTabActive(tab: (typeof TABS)[number], pathname: string, routerActive: boolean): boolean {
  if (tab.to !== '/') return routerActive
  return pathname === '/' || PLAY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
