import type { ChallengeStatus } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { challengeApi } from './api'

/** The sender's waiting screen asks this often whether the challenge was answered. */
export const STATUS_POLL_MS = 4_000

/** Polls a sent challenge until it is answered; undefined without an id or before the first answer. */
export function useChallengeStatus(id: string | undefined): ChallengeStatus | undefined {
  const query = useQuery({
    queryKey: ['challenge', id],
    queryFn: () => challengeApi.status(id ?? ''),
    enabled: id !== undefined,
    refetchInterval: (q) =>
      q.state.data?.status === 'pending' || !q.state.data ? STATUS_POLL_MS : false,
    retry: false,
  })
  return query.data?.status
}
