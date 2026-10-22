import type { PublicState } from '@bc/protocol'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useBadgeToasts } from '../../features/badges/toastStore'
import { useDuelStore } from '../../features/duel/store'
import { invalidateBadges } from '../../features/stats/useBadges'
import { useBuzz } from '../../features/duel/useFeedback'
import { sfx } from '../../lib/sound'
import { outcomeOf } from './duelUtils'

export const RESULT_DELAY_MS = 1400
const WIN_BUZZ = [40, 60, 40, 60, 160]
const LOSE_BUZZ = [80]

/**
 * On match end: win/lose sound and vibration, then the result route after 1400 ms, where the new badge
 * tiers (from `ended`) pop up one by one. Returns whether it ended.
 */
export function useEndFlow(roomId: string, state: PublicState, go: (to: string) => void): boolean {
  const endedEvent = useDuelStore((s) => s.ended)
  const qc = useQueryClient()
  const buzz = useBuzz()
  const outcome = outcomeOf(state, endedEvent)
  const isEnded = outcome !== null

  useEffect(() => {
    if (!outcome) return
    sfx.play(outcome === 'lose' ? 'lose' : 'win')
    buzz(outcome === 'win' ? WIN_BUZZ : LOSE_BUZZ)
    const id = setTimeout(() => {
      go(`/duel/${encodeURIComponent(roomId)}/result`)
      invalidateBadges(qc)
      useBadgeToasts.getState().push(useDuelStore.getState().ended?.newBadges)
    }, RESULT_DELAY_MS)
    return () => clearTimeout(id)
    // `go` and `buzz` are stable enough for a one-shot ending; re-running would restart the delay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, roomId])

  return isEnded
}
