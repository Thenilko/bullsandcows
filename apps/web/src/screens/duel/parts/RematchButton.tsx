import { useTranslation } from 'react-i18next'
import { Cta } from '../../../components/ui'
import type { RematchOffer } from '../../../features/duel/store'
import { useNow } from '../../../hooks/useNow'
import { fmtClock } from '../duelUtils'

export interface RematchButtonProps {
  offer: RematchOffer | null
  oppName: string
  onRematch(): void
}

/** Rematch CTA: plain, waiting for the opponent, or accepting their offer with its 30 s clock. */
export function RematchButton({ offer, oppName, onRematch }: RematchButtonProps) {
  const { t } = useTranslation()
  const now = useNow(500, offer !== null)
  const left = offer ? offer.expiresAt - now : 0
  const live = offer !== null && left > 0
  if (offer && !live) return <Cta disabled>{t('result.rematchExpired')}</Cta>
  if (live && offer.from === 'me') return <Cta disabled>{t('result.rematchWaiting', { name: oppName })}</Cta>
  if (live) {
    return (
      <Cta onClick={onRematch}>
        {t('result.rematchAccept')} {fmtClock(left)}
      </Cta>
    )
  }
  return <Cta onClick={onRematch}>{t('result.rematch')}</Cta>
}
