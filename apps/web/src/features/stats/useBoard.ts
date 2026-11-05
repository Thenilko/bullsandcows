import type { BoardDto, BoardKind, BoardPeriod } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { api } from '../auth/client'
import { shouldRetry } from './retry'

/** One of the boards besides „Точки“; only „Игри“ sends its period. */
export function useBoard(kind: BoardKind, period: BoardPeriod, enabled = true) {
  const query = kind === 'games' ? `?period=${period}` : ''
  return useQuery({
    queryKey: ['board', kind, kind === 'games' ? period : null],
    queryFn: () => api.get<BoardDto>(`/api/leaderboard/${kind}${query}`),
    enabled,
    retry: shouldRetry,
  })
}
