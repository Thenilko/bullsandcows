import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cta } from '../../components/ui'
import { useMe } from '../stats/useMe'
import { UpgradeDialog } from './UpgradeDialog'

/** A guest with more games than this is asked to make a profile. */
export const GUEST_NUDGE_AFTER = 5
export const NUDGE_DISMISSED_KEY = 'bc.guestNudge.dismissed'

const BOX = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '14px 14px 12px',
  borderRadius: 20,
  background: '#FBEFD0',
  border: '2px dashed #C99A3E',
  textAlign: 'left',
} as const
const TITLE = { margin: 0, fontSize: 17, fontWeight: 900, color: '#5B3A12' } as const
const TEXT = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: '#4A5640',
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
    return sessionStorage.getItem(NUDGE_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function shouldNudge(me: {
  profile: { isGuest: boolean }
  stats: { played: number }
}): boolean {
  return me.profile.isGuest && me.stats.played > GUEST_NUDGE_AFTER
}

/** Asks a regular guest to keep their points by making a profile; hidden for the session once dismissed. */
export function GuestNudge() {
  const { t } = useTranslation()
  const me = useMe().data
  const [dismissed, setDismissed] = useState(wasDismissed)
  const [open, setOpen] = useState(false)
  if (!me || dismissed || !shouldNudge(me)) return null

  function later() {
    try {
      sessionStorage.setItem(NUDGE_DISMISSED_KEY, '1')
    } catch {
      // the banner just comes back next time
    }
    setDismissed(true)
  }

  return (
    <aside aria-label={t('guestNudge.area')} style={BOX}>
      <p style={TITLE}>{t('guestNudge.title', { count: me.stats.played })}</p>
      <p style={TEXT}>{t('guestNudge.body', { xp: me.xp })}</p>
      {open ? (
        <UpgradeDialog />
      ) : (
        <>
          <Cta onClick={() => setOpen(true)}>{t('common.createProfile')}</Cta>
          <button type="button" onClick={later} style={LATER}>
            {t('guestNudge.later')}
          </button>
        </>
      )}
    </aside>
  )
}
