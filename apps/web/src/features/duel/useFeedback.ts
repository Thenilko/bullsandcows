import { useCallback } from 'react'
import { useSession } from '../auth/session'
import { buzz } from '../../lib/haptics'

/** Vibration helper that follows the profile preference (default on). */
export function useBuzz(): (pattern: number | number[]) => void {
  const enabled = useSession((s) => s.me?.profile.vibrate ?? true)
  return useCallback((pattern) => buzz(pattern, enabled), [enabled])
}
