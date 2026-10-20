import type { LeaderboardDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { api } from '../auth/client'
import { shouldRetry } from './retry'

export type Period = 'today' | 'week' | 'all'

export function useLeaderboard(period: Period, len: number, zero: boolean, enabled = true) {
  return useQuery({
    queryKey: ['leaderboard', period, len, zero],
    queryFn: () =>
      api.get<LeaderboardDto>(`/api/leaderboard?period=${period}&len=${len}&zero=${zero}`),
    enabled,
    retry: shouldRetry,
  })
}
