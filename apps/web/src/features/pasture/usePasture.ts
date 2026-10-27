import type { PastureDto, PasturePatch } from '@bc/protocol'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ScenePasture } from '../../components/scene/rewards'
import { api } from '../auth/client'
import { useSession } from '../auth/session'
import { shouldRetry } from '../stats/retry'
import { applyPasturePatch, asPastureDto, toScenePasture } from './pastureModel'

export const PASTURE_KEY = ['pasture'] as const
const MUTATION_KEY = ['pasture', 'patch'] as const

/** `GET /api/me/pasture`; only with a session (the login screens draw the plain pasture). */
export function usePasture(enabled = true) {
  const authed = useSession((s) => s.session !== null)
  return useQuery({
    queryKey: PASTURE_KEY,
    queryFn: async () => asPastureDto(await api.get<unknown>('/api/me/pasture')),
    enabled: enabled && authed,
    retry: shouldRetry,
    staleTime: 60_000,
  })
}

/** The pasture the shells draw: the screen's own (a preview, the gallery) or the player's. */
export function useScenePasture(override: ScenePasture | undefined): ScenePasture | undefined {
  const query = usePasture(override === undefined)
  const data = query.data
  return useMemo(() => override ?? (data ? toScenePasture(data) : undefined), [override, data])
}

/** Level, badges and so the rewards may have moved (a game ended, a share was counted). */
export function invalidatePasture(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: PASTURE_KEY })
}

/** Saves a toggle or a colour optimistically; a failed save restores the previous view. */
export function useUpdatePasture() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: async (patch: PasturePatch) => asPastureDto(await api.patch<unknown>('/api/me/pasture', patch)),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: PASTURE_KEY })
      const previous = qc.getQueryData<PastureDto>(PASTURE_KEY)
      if (previous) qc.setQueryData(PASTURE_KEY, applyPasturePatch(previous, patch))
      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) qc.setQueryData(PASTURE_KEY, context.previous)
    },
    onSuccess: (view) => {
      if (qc.isMutating({ mutationKey: MUTATION_KEY }) > 1) return
      qc.setQueryData(PASTURE_KEY, view)
    },
  })
}
