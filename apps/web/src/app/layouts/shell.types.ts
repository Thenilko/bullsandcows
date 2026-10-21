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
  /**
   * Mobile only: top offset of the panel on the 390x844 artboard (play screens: 356 solo, 266 duel). Marks the
   * screen as play-like: on compact phones the scene takes what is left above the panel and the tab bar hides.
   */
  panelTop?: number
  /** Mobile play-like screens: the panel keeps its natural height and never scrolls (solo play, MK3). */
  fit?: boolean
  /** Overlay rendered on top of the scene (HUD chips), as in the prototypes. */
  hud?: ReactNode
  /** Where the hud sits: `top` (solo chips) or `bottom`, just above the panel (PasDuel opponent strip). */
  hudAt?: 'top' | 'bottom'
  /** Mobile only: PasDuel's row at the top of the scene (back to the setup, title, sound), at every height. */
  topHud?: ReactNode
}

/** PasDuel desktop: the strip ends 34px above the scene card's lower edge. */
export const HUD_BOTTOM_DESKTOP = 34

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
