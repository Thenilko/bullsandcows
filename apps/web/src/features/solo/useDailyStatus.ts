import type { DailyStatusDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { fetchDailyStatus } from './api'

export const dailyStatusKey = (len: number, zero: boolean) => ['daily-status', len, zero] as const

/** Today's number for these settings and whether the player already finished it; undefined until known. */
export function useDailyStatus(len: number, zero: boolean): DailyStatusDto | undefined {
  const { data } = useQuery({
    queryKey: dailyStatusKey(len, zero),
    // Refetched on every visit: a daily game finished a minute ago changes it.
    queryFn: () => fetchDailyStatus(len, zero),
  })
  return data && typeof data.number === 'number' ? data : undefined
}
