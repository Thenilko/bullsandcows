import type { DistributionDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { api } from '../auth/client'
import { shouldRetry } from './retry'

export type DistributionKind = 'daily' | 'free'

/** Shared by the result screen and the prefetch at the winning guess. */
export const distributionQuery = (len: number, zero: boolean, kind: DistributionKind) => ({
  queryKey: ['distribution', len, zero, kind] as const,
  queryFn: () =>
    api.get<DistributionDto>(`/api/stats/distribution?len=${len}&zero=${zero}&kind=${kind}`),
  staleTime: 60_000,
})

export function useDistribution(
  len: number,
  zero: boolean,
  kind: DistributionKind,
  enabled = true,
) {
  return useQuery({ ...distributionQuery(len, zero, kind), enabled, retry: shouldRetry })
}
