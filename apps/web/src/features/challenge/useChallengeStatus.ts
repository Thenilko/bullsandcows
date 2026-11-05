import type { ChallengeStatusDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { challengeApi } from './api'

/** The sender's waiting screen asks this often whether the challenge was answered. */
export const STATUS_POLL_MS = 4_000

/**
 * Polls a sent challenge until it is answered: its status, „След играта“ and whether the target is in a game
 * right now. Undefined without an id or before the first answer.
 */
export function useChallengeStatus(id: string | undefined): ChallengeStatusDto | undefined {
  const query = useQuery({
    queryKey: ['challenge', id],
    queryFn: () => challengeApi.status(id ?? ''),
    enabled: id !== undefined,
    refetchInterval: (q) =>
      q.state.data?.status === 'pending' || !q.state.data ? STATUS_POLL_MS : false,
    retry: false,
  })
  return query.data
}
