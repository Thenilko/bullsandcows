import type { TFunction } from 'i18next'
import type { UiError } from '../../features/solo/store'

/** Seconds as mm:ss. */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** User-facing text for an input or server error; the server only sends codes. */
export function errorText(t: TFunction, err: UiError | null, len: number, guess: string): string {
  if (err === null) return ''
  if (err === 'LEN') return t('error.ERR_CODE', { count: len })
  if (err === 'REPEAT') return t('play.tried', { guess })
  if (err === 'NETWORK') return t('error.network')
  return t(`error.${err}`, { count: len })
}
