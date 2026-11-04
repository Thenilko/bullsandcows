import type { AdminGameDetailDto, AdminGamesDto } from '@bc/protocol'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api } from '../auth/client'
import { shouldRetry } from '../stats/retry'

/** `GET /api/admin/games`, 50 at a time; `userId` keeps one player's games. */
export function useAdminGames(enabled: boolean, userId: string | null) {
  return useInfiniteQuery({
    queryKey: ['admin', 'games', userId],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ offset: String(pageParam) })
      if (userId) params.set('user', userId)
      return api.get<AdminGamesDto>(`/api/admin/games?${params.toString()}`)
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled,
    retry: shouldRetry,
  })
}

/** `GET /api/admin/games/:id`: every guess, and the other side of a duel. */
export function useAdminGame(id: string) {
  return useQuery({
    queryKey: ['admin', 'game', id],
    queryFn: () => api.get<AdminGameDetailDto>(`/api/admin/games/${encodeURIComponent(id)}`),
    retry: shouldRetry,
  })
}
