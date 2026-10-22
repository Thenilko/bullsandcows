import type { Len } from '@bc/game-core'
import type { ClientMsg, PublicState } from '@bc/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shell } from '../../app/layouts/Shell'
import { DuelTopRow } from './parts/TopRow'
import { Keypad, Slots } from '../../components/ui'
import { useDuelStore } from '../../features/duel/store'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { IDLE_SCENE } from './scenes'
import { useSecretInput } from './useSecretInput'

export interface HideSecretProps {
  roomId: string
  state: PublicState
  send(msg: ClientMsg): void
}

const MASK = '•'
const COL = { display: 'flex', flexDirection: 'column', gap: 'var(--panel-gap, 14px)' } as const
/** PasDuel mobile: a 290px scene that the panel overlaps by 24px (MK10: focus mode, the keypad stays visible). */
const PANEL_TOP = 266

/** Classic format: choose my own number. It stays in this tab only; the server never returns it. */
export function HideSecret({ roomId, state, send }: HideSecretProps) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const cur = useDuelStore((s) => s.cur)
  const shake = useDuelStore((s) => s.shake)
  const input = useSecretInput(roomId, state, send)
  const [showDigits, setShowDigits] = useState(false)
  const hidden = state.me.hasSecret
  const oppName = state.opponentKind === 'bot' ? t('bot.name') : (state.opp?.username ?? '')

  const display = showDigits ? cur : MASK.repeat(cur.length)
  return (
    <Shell scene={IDLE_SCENE} screen="duel" title={t('duel.title.secret')} panelTop={PANEL_TOP} topHud={<DuelTopRow title={t('duel.title.secret')} />}>
      <section aria-label={t('duel.title.secret')} style={COL}>
        <h1 className="rise" style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>
          {t('duel.secret.title')}
        </h1>
        <p style={{ margin: 0, fontWeight: 700, color: '#4A5640', lineHeight: 1.45 }}>
          {t(state.zero ? 'duel.secret.textZero' : 'duel.secret.textNoZero', {
            count: state.len,
            name: oppName,
          })}
        </p>
        <Slots len={state.len as Len} current={display} active={!hidden} shake={shake} />
        <button
          type="button"
          className="icobtn"
          style={{ alignSelf: 'center', minHeight: 36, fontWeight: 800, color: '#4A5640' }}
          onClick={() => setShowDigits((v) => !v)}
        >
          {t(showDigits ? 'duel.secret.hide' : 'duel.secret.show')}
        </button>
        <p
          role="status"
          style={{
            margin: 0,
            minHeight: 16,
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 13,
            color: '#8A1F0B',
          }}
        >
          {input.needDigits ? t('duel.secret.needDigits', { count: state.len }) : ''}
        </p>
        <Keypad
          len={state.len as Len}
          zero={state.zero}
          current={cur}
          marks={{}}
          disabled={hidden}
          layout={desktop ? 'desktop' : 'mobile'}
          onPress={input.press}
          onBack={input.back}
          onSubmit={input.confirm}
          submitLabel={t(hidden ? 'duel.secret.waiting' : 'duel.secret.confirm')}
        />
        <span style={{ textAlign: 'center', fontWeight: 800, color: '#4A5640' }}>
          {t(state.opp?.hasSecret ? 'duel.secret.oppHidden' : 'duel.secret.oppHiding', {
            name: oppName,
          })}
        </span>
      </section>
    </Shell>
  )
}
