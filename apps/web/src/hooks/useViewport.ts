import { useMediaQuery } from './useMediaQuery'

/**
 * Compact phone viewport (MK1–MK12 reference row): under 760px of visible height the screens use their
 * compact spacing, the play screens hide the tab bar and the countdown covers the whole screen.
 * The same threshold lives in MobileShell.module.css as `@media (max-height: 760px)`.
 */
export function useIsCompact(): boolean {
  return useMediaQuery('(max-height: 760px)')
}
