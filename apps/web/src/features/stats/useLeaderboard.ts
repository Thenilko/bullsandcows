import type { LeaderboardDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { api } from '../auth/client'
import { shouldRetry } from './retry'

export type Period = 'today' | 'week' | 'all'

/**
 * `guest`: the guest's board (with `phantom`) is cached apart from a member's, so the board after an upgrade
 * is fetched again instead of showing the guest's copy.
 */
export function useLeaderboard(
  period: Period,
  len: number,
  zero: boolean,
  enabled = true,
  guest = false,
) {
  return useQuery({
    queryKey: guest
      ? ['leaderboard', period, len, zero, 'guest']
      : ['leaderboard', period, len, zero],
    queryFn: () =>
      api.get<LeaderboardDto>(`/api/leaderboard?period=${period}&len=${len}&zero=${zero}`),
    enabled,
    retry: shouldRetry,
  })
}
