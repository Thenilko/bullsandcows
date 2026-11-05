import type { GameViewDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { api } from '../auth/client'
import { shouldRetry } from './retry'

/** A game as the server sees it; the secret is present only once the game is over. */
export const fetchGame = (id: string) =>
  api.get<GameViewDto>(`/api/games/${encodeURIComponent(id)}`)

export function useGameResult(id: string | undefined) {
  return useQuery({
    queryKey: ['game', id],
    queryFn: () => fetchGame(id ?? ''),
    enabled: Boolean(id),
    retry: shouldRetry,
  })
}
