import { useTranslation } from 'react-i18next'
import { RewardIcon } from '../../features/pasture/RewardIcon'

const BUTTON = { width: '100%', textAlign: 'left', cursor: 'pointer' } as const

/** Профил → „Твоето пасище“: a row like the reward list's, leading to the screen. */
export function PastureLink({ onOpen }: { onOpen(): void }) {
  const { t } = useTranslation()
  return (
    <button type="button" className="unl" style={BUTTON} onClick={onOpen} data-testid="pasture-link">
      <span className="unl-ic">
        <RewardIcon item="dog" size={40} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 15 }}>{t('pasture.open')}</b>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-muted-aa)' }}>{t('pasture.rewards')}</span>
      </span>
      <span aria-hidden="true" style={{ fontSize: 22, fontWeight: 900, color: '#6B7560' }}>
        ›
      </span>
    </button>
  )
}
