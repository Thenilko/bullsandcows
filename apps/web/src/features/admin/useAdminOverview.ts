import type { AdminOverviewDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { api } from '../auth/client'
import { shouldRetry } from '../stats/retry'

/** The numbers refresh on their own while the panel is open. */
const REFRESH_MS = 60_000

/** `GET /api/admin/overview`; only fetched for an admin (`me.isAdmin`), the server refuses everyone else. */
export function useAdminOverview(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get<AdminOverviewDto>('/api/admin/overview'),
    enabled,
    retry: shouldRetry,
    refetchInterval: REFRESH_MS,
  })
}
