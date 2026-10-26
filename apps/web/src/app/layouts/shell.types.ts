import type { ReactNode } from 'react'
import type { PastureSceneProps, SceneMode } from '../../components/scene'

export interface SceneProps extends Omit<PastureSceneProps, 'className' | 'label'> {
  /** What the animals do (idle, running in after a verdict, the result); the wide desktop scene places them from it. */
  mode: SceneMode
  /** Game progress 0..1 (`progress().prog`); the wide scene's sun follows it (`wideSunY`). */
  prog: number
}

/**
 * Desktop screen key, the `sc-<screen>` class of the shell root (Desk.dc.html, PasDuel.dc.html). `new` covers
 * the PasDuel setup screens (new game, duel setup, queue, invite, found), `duel` the match itself.
 */
export type ScreenKey =
  | 'login'
  | 'rules'
  | 'play'
  | 'result'
  | 'board'
  | 'profile'
  | 'new'
  | 'duel'
  | 'pasture'
  | 'farm'
  | 'today'

export interface ShellProps {
  scene: SceneProps
  screen: ScreenKey
  children: ReactNode
  /** Desktop (PasDuel header): „· {title}“ after the logo. On phones the title travels with `topHud`. */
  title?: string
  /** Hides the tab bar (mobile) and the nav items (desktop); used while signed out. */
  bare?: boolean
  /**
   * Mobile only: top offset of the panel on the 390x844 artboard (play screens: 356 solo, 266 duel). Marks the
   * screen as play-like: on compact phones the scene takes what is left above the panel and the tab bar hides.
   */
  panelTop?: number
  /**
   * Mobile only, not play-like: the panel's top on the 390x844 artboard for a screen that shows the whole scene
   * („Твоето пасище“: 356, everything unlocked: 516); compact phones shrink the scene first.
   */
  sceneTop?: number
  /** Mobile play-like screens: the panel keeps its natural height and never scrolls (solo play, MK3). */
  fit?: boolean
  /** Overlay rendered on top of the scene (HUD chips), as in the prototypes. */
  hud?: ReactNode
  /** Where the hud sits: `top` (solo chips) or `bottom` (PasDuel opponent strip). */
  hudAt?: 'top' | 'bottom'
  /** Mobile only: PasDuel's row at the top of the scene (back to the setup, title, sound), at every height. */
  topHud?: ReactNode
}

export const TABS = [
  { to: '/', key: 'nav.play', end: true },
  { to: '/board', key: 'nav.board', end: false },
  { to: '/profile', key: 'nav.profile', end: false },
  { to: '/rules', key: 'nav.rules', end: false },
] as const

/** Route prefixes that belong to the "Игра" tab, so it stays highlighted on them. */
const PLAY_PREFIXES = ['/new', '/play', '/result', '/today'] as const
/** The family farm lives under „Класация“. */
const BOARD_PREFIXES = ['/farm', '/ferma'] as const

const under = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))

export function isTabActive(tab: (typeof TABS)[number], pathname: string, routerActive: boolean): boolean {
  if (tab.to === '/board') return routerActive || under(pathname, BOARD_PREFIXES)
  if (tab.to !== '/') return routerActive
  return pathname === '/' || under(pathname, PLAY_PREFIXES)
}
