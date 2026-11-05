import { useTranslation } from 'react-i18next'
import type { WarningEvent } from '../../../features/duel/store'
import { fmtClock } from '../duelUtils'

export const WARN_AT_SECS = 15

/** Milliseconds left on the turn clock: the warning event is authoritative, else the deadline. */
export function turnMsLeft(
  deadline: number | null,
  warning: WarningEvent | null,
  now: number,
): number | null {
  if (warning) return Math.max(0, warning.msLeft - Math.max(0, now - warning.at))
  return deadline === null ? null : Math.max(0, deadline - now)
}

export function isWarning(msLeft: number | null, warned: boolean): boolean {
  return msLeft !== null && (warned || Math.ceil(msLeft / 1000) <= WARN_AT_SECS)
}

const NUM = { fontVariantNumeric: 'tabular-nums' } as const

/** The turn clock as a scene pill (solo `.ps-hud`), red from the warning on. */
export function TurnTimer({ msLeft, warn }: { msLeft: number; warn: boolean }) {
  return (
    <span
      role="timer"
      data-warning={warn ? 'true' : 'false'}
      className="ps-hud"
      style={warn ? { ...NUM, background: '#B5452F', color: '#FFFFFF' } : NUM}
    >
      {fmtClock(msLeft)}
    </span>
  )
}

export function TurnWarning({ msLeft }: { msLeft: number }) {
  const { t } = useTranslation()
  return (
    <span role="alert" style={{ fontWeight: 900, fontSize: 13, color: 'var(--c-red-dark)' }}>
      {t('duel.play.turnWarning', { count: Math.ceil(msLeft / 1000) })}
    </span>
  )
}
