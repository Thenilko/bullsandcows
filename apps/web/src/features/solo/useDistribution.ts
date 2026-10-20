import { topOf } from '@bc/game-core'
import { useQuery } from '@tanstack/react-query'
import { fetchDistribution, type GameKind } from './api'

/** Average attempts of other players for these settings; undefined until known. */
export function useAverageAttempts(len: number, zero: boolean, kind: GameKind): number | undefined {
  const { data } = useQuery({
    queryKey: ['distribution', len, zero, kind],
    queryFn: () => fetchDistribution(len, zero, kind),
    staleTime: 5 * 60_000,
  })
  return data && data.histogram.length > 0 ? topOf(1, data.histogram).avg : undefined
}
