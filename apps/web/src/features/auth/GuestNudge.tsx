import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cta } from '../../components/ui'
import { useLeaderboard, type Period } from '../stats/useLeaderboard'
import { useMe } from '../stats/useMe'
import { PioneerLine } from './PioneerLine'
import { UpgradeDialog } from './UpgradeDialog'

/** A guest with more games than this is asked to make a profile. */
export const GUEST_NUDGE_AFTER = 5
export const NUDGE_DISMISSED_KEY = 'bc.guestNudge.dismissed'

/** The board a just-won game would be on: today's for a counted daily, this week's for a free game. */
export interface NudgeBoard {
  readonly period: Extract<Period, 'today' | 'week'>
  readonly len: number
  readonly zero: boolean
}

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
const PLACE = { margin: 0, fontSize: 19, fontWeight: 900, color: '#8E3424' } as const
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

/** The guest's „would be“ place on `board` (null while unknown, without a board or for a member). */
function usePhantomRank(board: NudgeBoard | undefined, guest: boolean): number | null {
  const query = useLeaderboard(
    board?.period ?? 'today',
    board?.len ?? 4,
    board?.zero ?? false,
    guest && board !== undefined,
    true,
  )
  return board && guest ? (query.data?.phantom?.rank ?? null) : null
}

/**
 * Asks a guest to keep their points by making a profile: a regular one (more than five games), or any guest
 * who just won a game that would place them on `board` („Днес щеше да си №N“). Hidden for the session once
 * dismissed.
 */
export function GuestNudge({ board }: { board?: NudgeBoard }) {
  const { t } = useTranslation()
  const me = useMe().data
  const [dismissed, setDismissed] = useState(wasDismissed)
  const [open, setOpen] = useState(false)
  const guest = me?.profile.isGuest === true && !dismissed
  const rank = usePhantomRank(board, guest)
  if (!me || !guest) return null
  const regular = shouldNudge(me)
  if (!regular && rank === null) return null

  function later() {
    try {
      sessionStorage.setItem(NUDGE_DISMISSED_KEY, '1')
    } catch {
      // the banner just comes back next time
    }
    setDismissed(true)
  }

  const placeKey = board?.period === 'week' ? 'guestNudge.phantomWeek' : 'guestNudge.phantomToday'
  return (
    <aside aria-label={t('guestNudge.area')} style={BOX}>
      {rank !== null ? <p style={PLACE}>{t(placeKey, { rank })}</p> : null}
      {regular ? (
        <>
          <p style={TITLE}>{t('guestNudge.title', { count: me.stats.played })}</p>
          <p style={TEXT}>{t('guestNudge.body', { xp: me.xp })}</p>
        </>
      ) : (
        <p style={TEXT}>{t('guestNudge.keepPlace')}</p>
      )}
      {open ? (
        <UpgradeDialog />
      ) : (
        <>
          <PioneerLine />
          <Cta onClick={() => setOpen(true)}>{t('common.createProfile')}</Cta>
          <button type="button" onClick={later} style={LATER}>
            {t('guestNudge.later')}
          </button>
        </>
      )}
    </aside>
  )
}
