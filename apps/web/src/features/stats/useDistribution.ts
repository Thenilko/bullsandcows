import type { DistributionDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { api } from '../auth/client'
import { shouldRetry } from './retry'

export type DistributionKind = 'daily' | 'free'

export function useDistribution(
  len: number,
  zero: boolean,
  kind: DistributionKind,
  enabled = true,
) {
  return useQuery({
    queryKey: ['distribution', len, zero, kind],
    queryFn: () =>
      api.get<DistributionDto>(`/api/stats/distribution?len=${len}&zero=${zero}&kind=${kind}`),
    enabled,
    retry: shouldRetry,
    staleTime: 60_000,
  })
}
