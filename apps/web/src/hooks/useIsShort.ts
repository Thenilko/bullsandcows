import { useMediaQuery } from './useMediaQuery'

/** A phone viewport with the browser bars showing (iPhone Safari is 664px tall): screens use their compact spacing. */
export function useIsShort(): boolean {
  return useMediaQuery('(max-height: 720px)')
}
