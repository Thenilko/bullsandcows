import type { BadgeStateDto } from '@bc/protocol'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { api } from '../auth/client'
import { shouldRetry } from './retry'

export const BADGES_KEY = ['badges'] as const

/** `GET /api/me/badges`: all 29 badges with tier and progress (guests get everything at tier 0). */
export function useBadges(enabled = true) {
  return useQuery({
    queryKey: BADGES_KEY,
    queryFn: () => api.get<BadgeStateDto[]>('/api/me/badges'),
    enabled,
    retry: shouldRetry,
    staleTime: 60_000,
  })
}

/** A game (or a share) ended: the tiers may have moved. */
export function invalidateBadges(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: BADGES_KEY })
}
