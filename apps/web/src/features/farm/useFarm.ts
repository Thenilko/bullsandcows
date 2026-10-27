import { FarmDto, FarmJoinedDto, MyFarmDto, MyNudgeDto, type NewBadgeDto } from '@bc/protocol'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '../auth/client'
import { useSession } from '../auth/session'
import { useBadgeToasts } from '../badges/toastStore'
import { invalidateBadges } from '../stats/useBadges'
import { shouldRetry } from '../stats/retry'

export const FARM_KEY = ['farm'] as const
export const NUDGE_KEY = ['farm', 'nudge'] as const

/** A signed-in member (not a guest): only they have a farm. */
export function useIsMember(): boolean {
  return useSession((s) => s.session !== null && s.session.user.isGuest !== true && s.me?.profile.isGuest !== true)
}

/** `GET /api/farms/me`: the farm or null; members only. */
export function useMyFarm() {
  const member = useIsMember()
  return useQuery({
    queryKey: FARM_KEY,
    queryFn: async () => MyFarmDto.parse(await api.get<unknown>('/api/farms/me')).farm,
    enabled: member,
    retry: shouldRetry,
    staleTime: 30_000,
  })
}

/** `GET /api/farms/me/nudge`: an unread nudge for today (the banner on „Игра“). */
export function useMyNudge() {
  const member = useIsMember()
  return useQuery({
    queryKey: NUDGE_KEY,
    queryFn: async () => MyNudgeDto.parse(await api.get<unknown>('/api/farms/me/nudge')).nudge,
    enabled: member,
    retry: shouldRetry,
    staleTime: 60_000,
  })
}

function joined(qc: QueryClient, data: FarmJoinedDto) {
  qc.setQueryData(FARM_KEY, data.farm)
  if (data.newBadges.length > 0) invalidateBadges(qc)
  useBadgeToasts.getState().push(data.newBadges as NewBadgeDto[])
}

export function useCreateFarm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => FarmJoinedDto.parse(await api.post<unknown>('/api/farms', { name })),
    onSuccess: (data) => joined(qc, data),
  })
}

export function useJoinFarm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => FarmJoinedDto.parse(await api.post<unknown>('/api/farms/join', { code })),
    onSuccess: (data) => joined(qc, data),
  })
}

/** Owner settings (name, new code, remove) answer with the farm. */
export function useFarmSettings() {
  const qc = useQueryClient()
  const store = (farm: FarmDto) => qc.setQueryData(FARM_KEY, farm)
  const rename = useMutation({
    mutationFn: async (name: string) => FarmDto.parse(await api.patch<unknown>('/api/farms/me', { name })),
    onSuccess: store,
  })
  const rotate = useMutation({
    mutationFn: async () => FarmDto.parse(await api.post<unknown>('/api/farms/me/code')),
    onSuccess: store,
  })
  const remove = useMutation({
    mutationFn: async (userId: string) => FarmDto.parse(await api.del<unknown>(`/api/farms/me/members/${encodeURIComponent(userId)}`)),
    onSuccess: store,
  })
  const leave = useMutation({
    mutationFn: () => api.post<unknown>('/api/farms/me/leave'),
    onSuccess: () => qc.setQueryData(FARM_KEY, null),
  })
  return { rename, rotate, remove, leave }
}

/** „Напомни“: marks the member as nudged in the cached farm right away. */
export function useNudge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.post<unknown>('/api/farms/me/nudge', { userId }),
    onSuccess: (_data, userId) => {
      const farm = qc.getQueryData<FarmDto | null>(FARM_KEY)
      if (!farm) return
      qc.setQueryData(FARM_KEY, { ...farm, members: farm.members.map((m) => (m.userId === userId ? { ...m, nudged: true } : m)) })
    },
  })
}

/** The × of the banner: hidden at once, marked read on the server. */
export function useDismissNudge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<unknown>('/api/farms/me/nudge/read'),
    onMutate: () => qc.setQueryData(NUDGE_KEY, null),
  })
}
