import type { MeDto, SettingsPatch } from '@bc/protocol'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../auth/client'
import { useSession } from '../auth/session'
import { syncMuted } from '../../lib/sound'
import { ME_KEY } from './useMe'

const MUTATION_KEY = ['settings'] as const

/** Returns a new profile with the patch applied; the input is left untouched. */
export function applyPatch(me: MeDto, patch: SettingsPatch): MeDto {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
  return { ...me, profile: { ...me.profile, ...defined } }
}

/** Saves settings optimistically; a failed save restores the previous profile and sound state. */
export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: (patch: SettingsPatch) => api.patch<MeDto>('/api/me/settings', patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ME_KEY })
      const previous = qc.getQueryData<MeDto>(ME_KEY)
      if (previous) qc.setQueryData(ME_KEY, applyPatch(previous, patch))
      if (patch.sound !== undefined) syncMuted(patch.sound)
      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (!context?.previous) return
      qc.setQueryData(ME_KEY, context.previous)
      syncMuted(context.previous.profile.sound)
    },
    onSuccess: (me) => {
      if (qc.isMutating({ mutationKey: MUTATION_KEY }) > 1) return
      qc.setQueryData(ME_KEY, me)
      useSession.getState().setMe(me)
    },
  })
}
