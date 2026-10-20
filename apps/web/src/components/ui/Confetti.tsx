import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const PALETTE = ['#B5452F', '#F2C230', '#FFFFFF', '#86C462', '#F29BB8'] as const
const PIECES = Array.from({ length: 26 }, (_, i) => ({
  l: `${(i * 37) % 100}%`,
  c: PALETTE[i % 5],
  t: `${2.6 + (i % 5) * 0.4}s`,
  d: `${(i % 7) * 0.25}s`,
}))

const LAYER_STYLE = { position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' } as const
const BANNER_STYLE = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  padding: '10px 16px',
  textAlign: 'center',
  fontWeight: 900,
  background: '#F2C230',
  color: '#2E3B24',
} as const

export function Confetti({ active }: { active: boolean }) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  if (!active) return null
  if (reduced) {
    return (
      <div role="status" className="confetti-banner" style={BANNER_STYLE}>
        {t('result.headline.win')}
      </div>
    )
  }
  return (
    <div aria-hidden="true" style={LAYER_STYLE}>
      {PIECES.map((p, i) => (
        <span key={i} className="confetti" style={{ left: p.l, background: p.c, animationDuration: p.t, animationDelay: p.d }} />
      ))}
    </div>
  )
}
