import type { Len } from '@bc/game-core'
import type { ClientMsg, PublicState } from '@bc/protocol'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Shell } from '../../app/layouts/Shell'
import { Card, Toast } from '../../components/ui'
import { readMySecret } from '../../features/duel/mySecret'
import { useDuelStore, type ToastInfo } from '../../features/duel/store'
import { Notebook } from '../../features/notebook/Notebook'
import { NotebookSheet } from '../../features/notebook/NotebookSheet'
import { NotesButton } from '../../features/notebook/NotesButton'
import { useNotebook } from '../../features/notebook/store'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { useNow } from '../../hooks/useNow'
import { sfx } from '../../lib/sound'
import { toNotebookGuesses } from './notebookGuesses'
import { GuessChips } from './parts/GuessChips'
import { OppGuessesCard } from './parts/OppGuessesCard'
import { OppStrip } from './parts/OppStrip'
import { Overlay } from './parts/Overlay'
import { PlayHeader } from './parts/PlayHeader'
import { PlayPad } from './parts/PlayPad'
import { DuelTopRow } from './parts/TopRow'
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

const COL = { display: 'flex', flexDirection: 'column', gap: 'var(--panel-gap, 10px)' } as const
// The keypad block never scrolls away; only the chips, the opponent card and „Предавам се“ below it do.
const SECTION = { ...COL, flex: '1 1 auto', minHeight: 0 } as const
const HEAD = { ...COL, flex: 'none' } as const
const TAIL = { ...COL, flex: '0 1 auto', minHeight: 0, overflowY: 'auto' } as const
/** PasDuel mobile: a 290px scene that the panel overlaps by 24px. */
const PANEL_TOP = 266
const GIVE_UP = {
  minHeight: 32,
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--c-muted-aa)',
  textDecoration: 'underline',
} as const

/** The notebook of one match: keyed by the room, like a solo game by its id. */
function useDuelNotebook(roomId: string, state: PublicState) {
  const nb = useNotebook(roomId)
  const guesses = useMemo(
    () => toNotebookGuesses(state.me.guesses, state.len as Len, state.zero),
    [state.me.guesses, state.len, state.zero],
  )
  return { marks: nb.marks, guesses, left: state.me.left }
}

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
  const notebook = useDuelNotebook(roomId, state)
  const [notesOpen, setNotesOpen] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  const closeNotes = useCallback(() => {
    sfx.play('page')
    setNotesOpen(false)
    opener.current?.focus()
  }, [])

  const m = playModel(state, store, now, ended)
  const oppName = m.bot ? t('bot.name') : (state.opp?.username ?? '')
  const title = m.bot ? t('duel.title.playBot') : t('duel.title.play', { format: t(`newGame.format.${state.format}.name`) })
  const mySecret = readMySecret(roomId)
  const waitOverlay =
    m.classic && m.playing && !m.myTurn
      ? {
          title: m.bot ? t('duel.play.botThinking') : t('duel.play.oppThinking', { name: oppName }),
          secret: mySecret,
        }
      : null
  const notesButton = desktop ? null : (
    <NotesButton
      buttonRef={opener}
      gameId={roomId}
      onClick={() => {
        sfx.play('page')
        setNotesOpen(true)
      }}
    />
  )

  return (
    <Shell
      scene={playScene(state, store.parity, store.miss)}
      sceneSide
      panelTop={PANEL_TOP}
      hudAt="bottom"
      hud={<OppStrip state={state} oppName={oppName} status={m.oppStatus} thinking={m.botTurn} />}
      topHud={<DuelTopRow title={title} extra={notesButton} />}
    >
      <section aria-label={title} style={SECTION}>
        <div style={HEAD}>
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
            marks={notebook.marks}
            overlay={waitOverlay}
            onPress={input.press}
            onBack={input.back}
            onSubmit={input.submit}
          />
        </div>
        <div style={TAIL}>
          <GuessChips guesses={state.me.guesses} label={t('duel.play.myGuesses')} />
          {m.classic ? (
            <OppGuessesCard state={state} oppName={oppName} mySecret={mySecret} />
          ) : (
            <p
              className="cmp-hide"
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--c-muted-aa)',
                textAlign: 'center',
              }}
            >
              {m.botTurn ? t('duel.play.botThinking') : t('duel.play.raceNote', { name: oppName })}
            </p>
          )}
          <button
            type="button"
            disabled={!m.playing}
            style={GIVE_UP}
            onClick={() => send({ t: 'giveUp' })}
          >
            {t('duel.play.giveUp')}
          </button>
        </div>
      </section>
      {desktop ? (
        <Card role="region" aria-label={t('notebook.title')} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Notebook gameId={roomId} guesses={notebook.guesses} left={notebook.left} layout="card" />
        </Card>
      ) : null}
      {notesOpen ? (
        <NotebookSheet gameId={roomId} guesses={notebook.guesses} left={notebook.left} onClose={closeNotes} />
      ) : null}
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
        ? t('duel.play.toast.classic', {
            name,
            guess: toast.guess,
            bulls: toast.bulls,
            cows: toast.cows,
          })
        : t('duel.play.toast.race', { name, attempt: toast.attempt })
  return (
    <Overlay>
      <Toast tick={toast.n}>{text}</Toast>
    </Overlay>
  )
}
