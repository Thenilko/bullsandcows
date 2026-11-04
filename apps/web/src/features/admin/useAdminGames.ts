import type {
  AdminDuelStatsDto,
  AdminGameDetailDto,
  AdminGameDto,
  AdminGamesDto,
  AdminOnlineDto,
  AdminUsersPageDto,
} from '@bc/protocol'
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
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

/** `GET /api/admin/users?offset=`: one page of every profile, most recently active first. */
export function useAdminUsers(enabled: boolean, offset: number) {
  return useQuery({
    queryKey: ['admin', 'users', offset],
    queryFn: () => api.get<AdminUsersPageDto>(`/api/admin/users?offset=${offset}`),
    enabled,
    retry: shouldRetry,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}

/** `GET /api/admin/online`, refreshed every 20 seconds while the panel is open. */
export function useAdminOnline(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'online'],
    queryFn: () => api.get<AdminOnlineDto>('/api/admin/online'),
    enabled,
    retry: shouldRetry,
    refetchInterval: 20_000,
  })
}

/** `POST /api/admin/games/:id/void`: the game becomes practice with 0 points; every admin list refreshes. */
export function useVoidGame() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<AdminGameDto>(`/api/admin/games/${encodeURIComponent(id)}/void`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

/** `GET /api/admin/duels`: the bot, duel endings and guess pace over the last 30 days. */
export function useAdminDuelStats(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'duels'],
    queryFn: () => api.get<AdminDuelStatsDto>('/api/admin/duels'),
    enabled,
    retry: shouldRetry,
    refetchInterval: 60_000,
  })
}
