import { AdminBotConfigDto, type BotConfigDto } from '@bc/protocol'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../auth/client'
import { shouldRetry } from '../stats/retry'

const KEY = ['admin', 'bot'] as const

/** `GET /api/admin/bot`: the bot tuning new bot rooms use, and the built-in values. */
export function useAdminBotConfig(enabled: boolean) {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => AdminBotConfigDto.parse(await api.get<unknown>('/api/admin/bot')),
    enabled,
    retry: shouldRetry,
  })
}

/** `PUT /api/admin/bot` with a config, or `DELETE` (`null`) to go back to the defaults. */
export function useSaveBotConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (config: BotConfigDto | null) =>
      AdminBotConfigDto.parse(
        await (config
          ? api.put<unknown>('/api/admin/bot', config)
          : api.del<unknown>('/api/admin/bot')),
      ),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  })
}
