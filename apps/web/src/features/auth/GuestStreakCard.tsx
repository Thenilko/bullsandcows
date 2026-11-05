import { BADGE_GLYPHS } from '@bc/game-core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cta } from '../../components/ui'
import { useMe } from '../stats/useMe'
import { UpgradeDialog } from './UpgradeDialog'

/** A guest's live day streak from this many days on is worth a warning. */
export const GUEST_STREAK_FROM = 3
export const STREAK_DISMISSED_KEY = 'bc.guestStreak.dismissed'

const BOX = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '14px 14px 12px',
  borderRadius: 20,
  background: '#FDE7D2',
  border: '2px solid #E59A5B',
  boxShadow: '0 6px 16px rgba(142,52,36,.12)',
  textAlign: 'left',
} as const
const ROW = { display: 'flex', alignItems: 'flex-start', gap: 10 } as const
const FLAME = { flex: 'none', marginTop: 1 } as const
const TEXT = {
  margin: 0,
  fontSize: 14,
  fontWeight: 800,
  color: '#5B2A12',
  lineHeight: 1.4,
} as const
const LATER = {
  minHeight: 36,
  fontWeight: 800,
  color: '#7A5230',
  textDecoration: 'underline',
} as const

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(STREAK_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function shouldWarnStreak(me: {
  profile: { isGuest: boolean }
  dayStreak?: number
}): boolean {
  return me.profile.isGuest && (me.dayStreak ?? 0) >= GUEST_STREAK_FROM
}

/** „Серия N дни!“: a guest's streak lives in this browser only; hidden for the session once dismissed. */
export function GuestStreakCard() {
  const { t } = useTranslation()
  const me = useMe().data
  const [dismissed, setDismissed] = useState(wasDismissed)
  const [open, setOpen] = useState(false)
  if (!me || dismissed || !shouldWarnStreak(me)) return null

  function later() {
    try {
      sessionStorage.setItem(STREAK_DISMISSED_KEY, '1')
    } catch {
      // the card just comes back next time
    }
    setDismissed(true)
  }

  return (
    <aside aria-label={t('guestStreak.area')} style={BOX} className="rise">
      <div style={ROW}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={FLAME}>
          <path
            d={BADGE_GLYPHS.flame}
            fill="#E9733A"
            stroke="#B5452F"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <p style={TEXT}>{t('guestStreak.text', { count: me.dayStreak ?? 0 })}</p>
      </div>
      {open ? (
        <UpgradeDialog />
      ) : (
        <>
          <Cta small onClick={() => setOpen(true)}>
            {t('common.createProfile')}
          </Cta>
          <button type="button" onClick={later} style={LATER}>
            {t('guestNudge.later')}
          </button>
        </>
      )}
    </aside>
  )
}
