import type { ClientMsg, PublicState } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Shell } from '../../app/layouts/Shell'
import { Toast } from '../../components/ui'
import { readMySecret } from '../../features/duel/mySecret'
import { useDuelStore, type ToastInfo } from '../../features/duel/store'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { useNow } from '../../hooks/useNow'
import { GuessChips } from './parts/GuessChips'
import { OppGuessesCard } from './parts/OppGuessesCard'
import { OppStrip } from './parts/OppStrip'
import { Overlay } from './parts/Overlay'
import { PlayHeader } from './parts/PlayHeader'
import { PlayPad } from './parts/PlayPad'
import { playModel } from './playModel'
import { playScene } from './scenes'
import { useEndFlow } from './useEndFlow'
import { useOppFeedback } from './useOppFeedback'
import { usePlayInput } from './usePlayInput'
import { useVerdictFeedback } from './useVerdictFeedback'
import { useBuzz } from '../../features/duel/useFeedback'

export interface DuelPlayProps {
  roomId: string
  state: PublicState
  send(msg: ClientMsg): void
}

const COL = { display: 'flex', flexDirection: 'column', gap: 10 } as const
const GIVE_UP = { minHeight: 32, fontSize: 13, fontWeight: 800, color: '#6B7560', textDecoration: 'underline' } as const

export function DuelPlay({ roomId, state, send }: DuelPlayProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const desktop = useIsDesktop()
  const buzz = useBuzz()
  const store = useDuelStore()
  const ended = useEndFlow(roomId, state, (to) => void navigate(to, { replace: true }))
  useVerdictFeedback(store.verdict, buzz)
  useOppFeedback(store.oppMoved)
  const input = usePlayInput(state, send)
  const now = useNow(500, state.phase === 'playing' && !ended)

  const m = playModel(state, store, now, ended)
  const oppName = m.bot ? t('bot.name') : (state.opp?.username ?? '')
  const mySecret = readMySecret(roomId)
  const waitOverlay = m.classic && m.playing && !m.myTurn ? { title: m.bot ? t('duel.play.botThinking') : t('duel.play.oppThinking', { name: oppName }), secret: mySecret } : null

  return (
    <Shell
      scene={playScene(state, store.parity, store.miss)}
      sceneSide
      hudAt="bottom"
      hud={<OppStrip state={state} oppName={oppName} status={m.oppStatus} thinking={m.botTurn} />}
    >
      <section aria-label={t('duel.title.play', { format: t(`newGame.format.${state.format}.name`) })} style={COL}>
        <PlayHeader
          attempt={state.me.guesses.length + 1}
          turn={m.classic ? (m.myTurn ? 'me' : 'opp') : null}
          msLeft={m.msLeft}
          warn={m.warn}
          clockMs={state.startedAt ? (state.endedAt ?? now) - state.startedAt : 0}
        />
        <PlayPad
          state={state}
          cur={store.cur}
          shake={store.shake}
          errCode={store.errCode}
          disabled={!m.playing || (m.classic && !m.myTurn)}
          desktop={desktop}
          overlay={waitOverlay}
          onPress={input.press}
          onBack={input.back}
          onSubmit={input.submit}
        />
        <GuessChips guesses={state.me.guesses} label={t('duel.play.myGuesses')} />
        {m.classic ? (
          <OppGuessesCard state={state} oppName={oppName} mySecret={mySecret} />
        ) : (
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6B7560', textAlign: 'center' }}>
            {m.botTurn ? t('duel.play.botThinking') : t('duel.play.raceNote', { name: oppName })}
          </p>
        )}
        <button type="button" disabled={!m.playing} style={GIVE_UP} onClick={() => send({ t: 'giveUp' })}>
          {t('duel.play.giveUp')}
        </button>
      </section>
      <OppToast toast={store.toast} name={oppName} />
    </Shell>
  )
}

function OppToast({ toast, name }: { toast: ToastInfo | null; name: string }) {
  const { t } = useTranslation()
  if (!toast) return null
  const text =
    toast.kind === 'solved'
      ? t('duel.play.toast.solved', { name })
      : toast.kind === 'classic'
        ? t('duel.play.toast.classic', { name, guess: toast.guess, bulls: toast.bulls, cows: toast.cows })
        : t('duel.play.toast.race', { name, attempt: toast.attempt })
  return (
    <Overlay>
      <Toast tick={toast.n}>{text}</Toast>
    </Overlay>
  )
}
