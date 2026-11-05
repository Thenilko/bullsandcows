import type { MeDto } from '@bc/protocol'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '../auth/client'
import { useSession } from '../auth/session'
import { syncMuted } from '../../lib/sound'
import { shouldRetry } from './retry'

export const ME_KEY = ['me'] as const

/** The signed-in user's profile (screens using it sit behind `RequireAuth`); the result is mirrored into the session store and the sound switch. */
export function useMe(options: { fresh?: boolean } = {}) {
  const query = useQuery({
    queryKey: ME_KEY,
    queryFn: () => api.get<MeDto>('/api/me'),
    retry: shouldRetry,
    ...(options.fresh ? { refetchOnMount: 'always' as const } : {}),
  })
  const data = query.data
  useEffect(() => {
    if (!data) return
    useSession.getState().setMe(data)
    syncMuted(data.profile.sound)
  }, [data])
  return query
}

/**
 * Reloads the profile after a game or a duel: the server has just credited XP (and a duel's rating), so the
 * header, the level bar and the profile show the new numbers without a page reload.
 */
export function refreshMe(qc: QueryClient): void {
  api.get<MeDto>('/api/me').then(
    (me) => {
      qc.setQueryData(ME_KEY, me)
      useSession.getState().setMe(me)
    },
    () => void qc.invalidateQueries({ queryKey: ME_KEY }),
  )
}
