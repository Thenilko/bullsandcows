import { useTranslation } from 'react-i18next'
import { HouseGlyph, Medal } from '../farm/parts'

const BUTTON = { width: '100%', textAlign: 'left', cursor: 'pointer' } as const

/** Профил → „Семейна ферма“: the same row as „Твоето пасище“, leading to `/farm`. */
export function FarmLink({ onOpen }: { onOpen(): void }) {
  const { t } = useTranslation()
  return (
    <button type="button" className="unl" style={BUTTON} onClick={onOpen} data-testid="farm-link">
      <span className="unl-ic">
        <Medal tone="gold" size={40}>
          <HouseGlyph />
        </Medal>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 15 }}>{t('farm.hud.title')}</b>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-muted-aa)' }}>
          {t('farm.profileLink')}
        </span>
      </span>
      <span aria-hidden="true" style={{ fontSize: 22, fontWeight: 900, color: '#6B7560' }}>
        ›
      </span>
    </button>
  )
}
