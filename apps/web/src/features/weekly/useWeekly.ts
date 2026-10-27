import { GameViewDto, WeeklyBoardDto, WeeklyDto } from '@bc/protocol'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../auth/client'
import { useIsMember } from '../farm/useFarm'
import { gameKey } from '../solo/gameKey'
import { shouldRetry } from '../stats/retry'

export const WEEKLY_KEY = ['weekly'] as const

/** `GET /api/weekly`: the current week for a member (guests do not take part). */
export function useWeekly() {
  const member = useIsMember()
  return useQuery({
    queryKey: WEEKLY_KEY,
    queryFn: async () => WeeklyDto.parse(await api.get<unknown>('/api/weekly')),
    enabled: member,
    retry: shouldRetry,
    staleTime: 30_000,
  })
}

/** `GET /api/weekly/{week}/board`. */
export function useWeeklyBoard(weekId: string | undefined) {
  const member = useIsMember()
  return useQuery({
    queryKey: [...WEEKLY_KEY, 'board', weekId],
    queryFn: async () =>
      WeeklyBoardDto.parse(
        await api.get<unknown>(`/api/weekly/${encodeURIComponent(weekId ?? '')}/board?limit=50`),
      ),
    enabled: member && weekId !== undefined,
    retry: shouldRetry,
    staleTime: 30_000,
  })
}

/** `POST /api/weekly/start`: today's game (a new one, or the unfinished one); cached for the play screen. */
export function useStartWeekly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => GameViewDto.parse(await api.post<unknown>('/api/weekly/start')),
    onSuccess: (game) => {
      qc.setQueryData(gameKey(game.id), game)
      // `/weekly/play` reads today's game from the week: known right away, refreshed in the background.
      const week = qc.getQueryData<WeeklyDto>(WEEKLY_KEY)
      if (week)
        qc.setQueryData(WEEKLY_KEY, { ...week, today: { gameId: game.id, finished: false } })
      void qc.invalidateQueries({ queryKey: WEEKLY_KEY })
    },
  })
}

/** П8 was shown: hidden at once, marked seen on the server. */
export function useSeenAward() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<unknown>('/api/weekly/award/seen'),
    onMutate: () => {
      const week = qc.getQueryData<WeeklyDto>(WEEKLY_KEY)
      if (week) qc.setQueryData(WEEKLY_KEY, { ...week, award: null })
    },
  })
}
