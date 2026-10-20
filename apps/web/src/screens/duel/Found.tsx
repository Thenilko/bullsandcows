import type { ClientMsg, PublicState } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Shell } from '../../app/layouts/Shell'
import { Countdown, Cta, Toast } from '../../components/ui'
import { useDuelStore } from '../../features/duel/store'
import { sfx } from '../../lib/sound'
import { Avatar } from './parts/Avatar'
import { Overlay } from './parts/Overlay'
import { SettingChips } from './parts/SettingChips'
import { IDLE_SCENE } from './scenes'
import { COUNTDOWN_TOTAL_MS, useCountdownRun } from './useCountdownRun'
import { useFoundFeedback } from './useFoundFeedback'
import { botLevelKey } from './duelUtils'

export interface FoundProps {
  state: PublicState
  send(msg: ClientMsg): void
}

const READY_TAG = { background: '#DCEFD0', color: '#2E5E1E' } as const
const WAIT_TAG = { background: '#ECE5D2', color: 'var(--c-muted-aa)' } as const
const noop = (): void => undefined

export function Found({ state, send }: FoundProps) {
  const { t } = useTranslation()
  const startAt = useDuelStore((s) => s.startAt ?? (state.phase === 'countdown' && state.countdownAt !== null ? state.countdownAt + COUNTDOWN_TOTAL_MS : null))
  const running = useCountdownRun(startAt)
  const opp = state.opp
  const bot = state.opponentKind === 'bot'
  const oppName = bot ? t('bot.name') : (opp?.username ?? '')
  const oppReady = opp?.ready ?? false
  const feedback = useFoundFeedback(oppReady, bot)

  function ready() {
    if (state.me.ready) return
    sfx.play('pop')
    send({ t: 'ready' })
  }

  const titleKey = bot ? 'duel.found.title.bot' : state.opponentKind === 'friend' ? 'duel.found.title.friend' : 'duel.found.title.human'
  const label = state.me.ready ? (opp?.ready ? t('duel.found.starting') : t('duel.found.waitingFor', { name: oppName })) : t('duel.found.ready')
  return (
    <Shell scene={IDLE_SCENE} sceneSide>
      <section aria-label={t(bot ? 'duel.title.foundBot' : 'duel.title.found')} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 className="rise" style={{ margin: 0, fontSize: 26, fontWeight: 900, textAlign: 'center' }}>
          {t(titleKey, { name: oppName })}
        </h1>
        <Versus state={state} oppName={oppName} />
        <SettingChips len={state.len} zero={state.zero} format={state.format} extra={bot ? t('newGame.chip.bot', { level: t(`bot.level.${botLevelKey(state.botLevel)}.name`) }) : undefined} />
        <p style={{ margin: 0, textAlign: 'center', fontWeight: 700, color: '#4A5640', lineHeight: 1.5 }}>{t(`duel.found.rule.${state.format}`)}</p>
        <Cta disabled={state.me.ready || opp === null} style={{ minHeight: 60, fontSize: 20 }} onClick={ready}>
          {label}
        </Cta>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-muted-aa)', textAlign: 'center' }}>{t('duel.found.clockNote')}</span>
      </section>
      {feedback.readyToast > 0 ? (
        <Overlay>
          <Toast tick={feedback.readyToast}>{t('duel.found.opponentReady', { name: oppName })}</Toast>
        </Overlay>
      ) : null}
      {running ? (
        <Overlay>
          <Countdown running onDone={noop} onTick={feedback.tick} />
        </Overlay>
      ) : null}
    </Shell>
  )
}

interface PlayerCardProps {
  side: 'L' | 'R'
  ready: boolean
  kind: 'me' | 'human' | 'bot'
  name: string
  sub: string
  waiting?: boolean
}

function PlayerCard({ side, ready, kind, name, sub, waiting = false }: PlayerCardProps) {
  const { t } = useTranslation()
  const tag = ready ? t('duel.found.status.ready') : t(side === 'L' ? 'duel.found.status.waiting' : 'duel.found.status.waitingDots')
  return (
    <div className={`pcard vs${side}${ready ? ' ready' : ''}`}>
      <Avatar kind={kind} size={64} />
      <b style={{ fontSize: 17 }}>{waiting ? '…' : name}</b>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#4A5640' }}>{sub}</span>
      <span className="tag" style={ready ? READY_TAG : WAIT_TAG}>
        {tag}
      </span>
    </div>
  )
}

function Versus({ state, oppName }: { state: PublicState; oppName: string }) {
  const { t } = useTranslation()
  const opp = state.opp
  const bot = state.opponentKind === 'bot'
  const sub = bot
    ? t('duel.found.botSub', { level: t(`bot.level.${botLevelKey(state.botLevel)}.name`) })
    : opp
      ? t('duel.found.level', { level: opp.level, rating: opp.rating })
      : ''
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <PlayerCard side="L" ready={state.me.ready} kind="me" name={state.me.username} sub={t('duel.found.level', { level: state.me.level, rating: state.me.rating })} />
      <span className="vsx" style={{ fontSize: 26, fontWeight: 900, color: '#B5452F' }}>
        VS
      </span>
      <PlayerCard side="R" ready={opp?.ready ?? false} kind={bot ? 'bot' : 'human'} name={oppName} sub={sub} waiting={opp === null} />
    </div>
  )
}
