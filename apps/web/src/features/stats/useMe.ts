import type { MeDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '../auth/client'
import { useSession } from '../auth/session'
import { syncMuted } from '../../lib/sound'
import { shouldRetry } from './retry'

export const ME_KEY = ['me'] as const

/** The signed-in user's profile (screens using it sit behind `RequireAuth`); the result is mirrored into the session store and the sound switch. */
export function useMe() {
  const query = useQuery({
    queryKey: ME_KEY,
    queryFn: () => api.get<MeDto>('/api/me'),
    retry: shouldRetry,
  })
  const data = query.data
  useEffect(() => {
    if (!data) return
    useSession.getState().setMe(data)
    syncMuted(data.profile.sound)
  }, [data])
  return query
}
