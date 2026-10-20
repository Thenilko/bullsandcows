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

/** The "hidden in the fog" gate: the clock starts only after Start and the 3-2-1 countdown. */
export function StartOverlay({ desktop, info, running, onBegin, onDone }: StartOverlayProps) {
  const { t } = useTranslation()
  const style = desktop
    ? { ...BASE, borderRadius: 24, background: 'rgba(255,253,246,.95)', gap: 16, padding: 28 }
    : { ...BASE, borderRadius: '26px 26px 0 0', background: 'rgba(246,242,230,.95)' }
  return (
    <div className="fadein" style={style}>
      {running ? null : (
        <>
          <h2 className="rise" style={{ margin: 0, fontSize: desktop ? 32 : 26, fontWeight: 900, lineHeight: 1.15 }}>
            {t('play.hiddenTitle')}
          </h2>
          <p style={{ margin: 0, fontSize: desktop ? 17 : undefined, fontWeight: 700, color: '#4A5640', lineHeight: 1.5 }}>
            {t('play.hiddenText')}
          </p>
          <span style={{ fontSize: desktop ? 14 : 13, fontWeight: 800, color: 'var(--c-muted-aa)' }}>{info}</span>
          <Cta
            className="float"
            onClick={onBegin}
            style={{ minWidth: desktop ? 260 : 230, minHeight: desktop ? 70 : 66, fontSize: desktop ? 26 : 24, letterSpacing: '.04em' }}
          >
            {t('common.start')}
          </Cta>
          {desktop ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-muted-aa)' }}>{t('play.orEnter')}</span> : null}
        </>
      )}
      <Countdown running={running} onDone={onDone} onTick={() => sfx.play('chirp')} />
    </div>
  )
}
