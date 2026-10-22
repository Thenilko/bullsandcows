import { useMediaQuery } from './useMediaQuery'

export type DesktopMode = 'immersive' | 'split'

/** Desk.dc.html `frame()`: `tall = height >= 820` picks the immersive layout; the width guard matches `useIsDesktop`. */
export const IMMERSIVE_QUERY = '(min-width: 768px) and (min-height: 820px)'

/**
 * Desktop layout mode: `immersive` (full-bleed wide scene, the hanging board) from 820px of height, `split`
 * (scene card on the left, panel column on the right) below that. Only meaningful while `useIsDesktop()` is
 * true; narrower viewports report `split`.
 */
export function useDesktopMode(): DesktopMode {
  return useMediaQuery(IMMERSIVE_QUERY) ? 'immersive' : 'split'
}
