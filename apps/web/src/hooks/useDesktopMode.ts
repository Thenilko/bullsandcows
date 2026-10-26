import { useMediaQuery } from './useMediaQuery'

export type DesktopMode = 'immersive' | 'split'

/**
 * Desk.dc.html `frame()`: `tall = height >= 820` picks the immersive layout. The width floor is 1100px rather
 * than the 768px of `useIsDesktop`: the hanging board (600) and the notebook sheet (360) need about 1030px
 * side by side, so a portrait tablet stays on the split layout.
 */
export const IMMERSIVE_QUERY = '(min-width: 1100px) and (min-height: 820px)'

/**
 * Desktop layout mode: `immersive` (full-bleed wide scene, the hanging board) from 820px of height, `split`
 * (scene card on the left, panel column on the right) below that. Only meaningful while `useIsDesktop()` is
 * true; narrower viewports report `split`.
 */
export function useDesktopMode(): DesktopMode {
  return useMediaQuery(IMMERSIVE_QUERY) ? 'immersive' : 'split'
}
