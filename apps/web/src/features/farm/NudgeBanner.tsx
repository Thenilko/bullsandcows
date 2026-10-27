import type { NudgeDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { CloseIcon, RankAvatar } from '../../components/ui'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useDismissNudge, useMyNudge } from './useFarm'

export interface NudgeCardProps {
  nudge: NudgeDto
  onClose(): void
}

/** П4 / ПД8 `.nudge`: „Тати те подсеща“ with how many in the farm have played; × marks it read. */
export function NudgeCard({ nudge, onClose }: NudgeCardProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <div className={reduced ? 'nudge' : 'nudge sheetup'} role="status" data-testid="nudge">
      <RankAvatar species={nudge.fromSpecies} rankKey={nudge.fromRankKey} size={44} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <b style={{ fontSize: 15, overflowWrap: 'anywhere' }}>{t('farm.nudgeBanner.title', { name: nudge.fromUsername })}</b>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#4A5640' }}>
          {t('farm.nudgeBanner.text', { played: nudge.played, total: nudge.members })}
        </span>
      </span>
      <button type="button" className="iconbox icobtn" aria-label={t('farm.nudgeBanner.close')} style={{ width: 36, height: 36, flex: 'none' }} onClick={onClose}>
        <CloseIcon size={18} />
      </button>
    </div>
  )
}

/** The banner at the top of „Игра“ while there is an unread nudge for today (nothing otherwise). */
export function NudgeBanner() {
  const nudge = useMyNudge().data
  const dismiss = useDismissNudge()
  if (!nudge) return null
  return <NudgeCard nudge={nudge} onClose={() => dismiss.mutate()} />
}
