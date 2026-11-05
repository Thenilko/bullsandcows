import { BADGE_GLYPHS } from '@bc/game-core'
import type { PioneerDto } from '@bc/protocol'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from './client'

export const PIONEER_KEY = ['pioneer'] as const
const PIONEER_STALE_MS = 60_000

const LINE = {
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  fontWeight: 900,
  color: '#7A4A0E',
} as const
const FLAG = { flex: 'none' } as const

/** `GET /api/auth/pioneer`: spots left for „Пионер“; a failure just hides the line. */
export function usePioneerSpots() {
  return useQuery({
    queryKey: PIONEER_KEY,
    queryFn: () => api.get<PioneerDto>('/api/auth/pioneer'),
    staleTime: PIONEER_STALE_MS,
    retry: false,
  })
}

/** „Остават N места за значка „Пионер“ + 100 XP“ while spots remain; nothing otherwise. */
export function PioneerLine() {
  const { t } = useTranslation()
  const left = usePioneerSpots().data?.left ?? 0
  if (left <= 0) return null
  return (
    <p style={LINE} data-testid="pioneer-line">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={FLAG}>
        <path
          d={BADGE_GLYPHS.flag}
          fill="none"
          stroke="#C99A3E"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {t('pioneer.left', { count: left })}
    </p>
  )
}
