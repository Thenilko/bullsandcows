import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { SoundIconButton } from '../../../components/ui/SoundIconButton'

const ROW = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } as const

/** PasDuel mobile: the row at the top of the scene — back to the setup, the screen title, the sound toggle. */
export function DuelTopRow({ title }: { title: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div style={ROW}>
      <button type="button" className="iconbox icobtn" aria-label={t('duel.toSetup')} onClick={() => void navigate('/new')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E3B24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span className="ps-hud" style={{ fontSize: 14 }}>{title}</span>
      <SoundIconButton />
    </div>
  )
}
