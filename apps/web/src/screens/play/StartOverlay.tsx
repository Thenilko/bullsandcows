import { useTranslation } from 'react-i18next'
import { Countdown, Cta } from '../../components/ui'
import { sfx } from '../../lib/sound'

export interface StartOverlayProps {
  desktop: boolean
  info: string
  running: boolean
  onBegin(): void
  onDone(): void
}

const BASE = {
  position: 'absolute',
  inset: 0,
  backdropFilter: 'blur(4px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  padding: 24,
  textAlign: 'center',
} as const
const DESKTOP = { ...BASE, borderRadius: 24, background: 'rgba(255,253,246,.95)', gap: 16, padding: 28 } as const
// Mobile: the card covers only the panel (MK1); its sizes follow the shell's compact variables.
const MOBILE = { ...BASE, borderRadius: '26px 26px 0 0', background: 'rgba(246,242,230,.95)' } as const

/**
 * The "hidden in the fog" gate: the clock starts only after Start and the 3-2-1 countdown. On phones the
 * countdown covers the whole screen (MK2) and the card is gone meanwhile; on desktop it plays inside the card.
 */
export function StartOverlay({ desktop, info, running, onBegin, onDone }: StartOverlayProps) {
  const { t } = useTranslation()
  const tick = () => sfx.play('chirp')
  if (!desktop && running) return <Countdown screen running onDone={onDone} onTick={tick} />
  return (
    <div className="fadein" style={desktop ? DESKTOP : MOBILE}>
      {running ? null : (
        <>
          <h2 className="rise" style={{ margin: 0, fontSize: desktop ? 32 : 'var(--start-h1, 26px)', fontWeight: 900, lineHeight: 1.15 }}>
            {t('play.hiddenTitle')}
          </h2>
          <p style={{ margin: 0, fontSize: desktop ? 17 : undefined, fontWeight: 700, color: '#4A5640', lineHeight: 1.5 }}>
            {t('play.hiddenText')}
          </p>
          <span style={{ fontSize: desktop ? 14 : 13, fontWeight: 800, color: 'var(--c-muted-aa)' }}>{info}</span>
          <Cta
            className="float"
            onClick={onBegin}
            style={{ minWidth: desktop ? 260 : 230, minHeight: desktop ? 70 : 'var(--start-btn, 66px)', fontSize: desktop ? 26 : 24, letterSpacing: '.04em' }}
          >
            {t('common.start')}
          </Cta>
          {desktop ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-muted-aa)' }}>{t('play.orEnter')}</span> : null}
        </>
      )}
      <Countdown running={running} onDone={onDone} onTick={tick} />
    </div>
  )
}
