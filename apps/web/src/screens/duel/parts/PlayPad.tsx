import type { Len } from '@bc/game-core'
import type { PublicState } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Inset, Keypad, Slots } from '../../../components/ui'
import type { ErrorCode } from '@bc/protocol'
import { errorText } from '../../../features/duel/errorText'

export interface PlayPadProps {
  state: PublicState
  cur: string
  shake: number
  errCode: ErrorCode | null
  disabled: boolean
  desktop: boolean
  /** Shown over the keypad while the opponent is on turn (classic). */
  overlay: { title: string; secret: string } | null
  onPress(d: string): void
  onBack(): void
  onSubmit(): void
}

const COL = { display: 'flex', flexDirection: 'column', gap: 10 } as const

/** Last-verdict line, input slots, error line, keypad and the opponent-turn overlay. */
export function PlayPad({ state, cur, shake, errCode, disabled, desktop, overlay, onPress, onBack, onSubmit }: PlayPadProps) {
  const { t } = useTranslation()
  const last = state.me.guesses[state.me.guesses.length - 1]
  return (
    <>
      <Inset style={{ padding: '10px 12px', fontWeight: 800, fontSize: 14 }}>
        {last
          ? t('duel.play.last', { guess: last.guess, bulls: t('common.bull', { count: last.bulls }), cows: t('common.cow', { count: last.cows }), left: state.me.left })
          : t(state.zero ? 'duel.play.promptZero' : 'duel.play.promptNoZero', { count: state.len })}
      </Inset>
      <Slots len={state.len as Len} current={cur} active={!disabled} shake={shake} />
      <p role="status" style={{ margin: '-4px 0 0', minHeight: 16, textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#8A1F0B' }}>
        {errCode ? errorText(t, errCode, state.len) : ''}
      </p>
      <div style={{ position: 'relative', ...COL }}>
        <Keypad len={state.len as Len} zero={state.zero} current={cur} marks={{}} disabled={disabled} layout={desktop ? 'desktop' : 'mobile'} onPress={onPress} onBack={onBack} onSubmit={onSubmit} />
        {overlay ? (
          <div className="fadein" style={{ position: 'absolute', inset: -6, borderRadius: 18, background: 'rgba(246,242,230,.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <b style={{ fontSize: 18 }}>{overlay.title}</b>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4A5640' }}>{t('duel.play.tryingToGuess', { secret: overlay.secret })}</span>
          </div>
        ) : null}
      </div>
    </>
  )
}
