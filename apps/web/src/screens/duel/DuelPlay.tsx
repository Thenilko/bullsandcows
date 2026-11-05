import type { Len } from '@bc/game-core'
import type { ClientMsg, PublicState } from '@bc/protocol'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Shell } from '../../app/layouts/Shell'
import { Toast } from '../../components/ui'
import { useDueTip } from '../../features/coach/store'
import { readMySecret } from '../../features/duel/mySecret'
import { useDuelStore, type ToastInfo } from '../../features/duel/store'
import { useBuzz } from '../../features/duel/useFeedback'
import { NotebookSheet } from '../../features/notebook/NotebookSheet'
import { NotesButton } from '../../features/notebook/NotesButton'
import { useNotesSheet } from '../../features/notebook/sheet'
import { useNotebook } from '../../features/notebook/store'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { useNow } from '../../hooks/useNow'
import { sfx } from '../../lib/sound'
import { GuessBoard, OppBoard, type BoardSection } from '../play/GuessBoard'
import { PanelHead, PhoneHud } from '../play/PanelParts'
import { toNotebookGuesses } from './notebookGuesses'
import {
  DuelDesktopPlay,
  DuelGiveUp,
  DuelInput,
  DuelPills,
  DuelStatus,
  StripStack,
  type DuelView,
} from './parts/DuelPanel'
import { OppStrip } from './parts/OppStrip'
import { Overlay } from './parts/Overlay'
import { playModel } from './playModel'
import { playScene } from './scenes'
import { useDuelKeyboard } from './useDuelKeyboard'
import { useEndFlow } from './useEndFlow'
import { useOppFeedback } from './useOppFeedback'
import { usePlayInput } from './usePlayInput'
import { useVerdictFeedback } from './useVerdictFeedback'

export interface DuelPlayProps {
  roomId: string
  state: PublicState
  send(msg: ClientMsg): void
}

/** The solo play panel's top on the 390×844 artboard: duels hang the same board over the same scene. */
const PANEL_TOP = 356
const COL = { display: 'flex', flexDirection: 'column', gap: 'var(--panel-gap, 10px)' } as const

/** The notebook's id: one per match, so a rematch in the same room starts with a clean page. */
export const notebookId = (roomId: string, state: Pick<PublicState, 'startedAt'>): string =>
  state.startedAt === null ? roomId : `${roomId}:${state.startedAt}`

/** Classic: what the opponent has tried against my number, for the board. */
export function oppSection(state: PublicState, label: string, empty: string): BoardSection {
  const guesses = (state.opp?.guesses ?? []).flatMap((g) =>
    g.guess === null ? [] : [{ guess: g.guess, bulls: g.bulls ?? 0, cows: g.cows ?? 0 }],
  )
  return { label, guesses, empty }
}

/** Derives everything the panel shows from the snapshot, the store and the clock. */
function useDuelView(roomId: string, state: PublicState, send: (msg: ClientMsg) => void) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const store = useDuelStore()
  const ended = useEndFlow(roomId, state, (to) => void navigate(to, { replace: true }))
  const input = usePlayInput(roomId, state, send)
  const now = useNow(500, state.phase === 'playing' && !ended)
  const nbId = notebookId(roomId, state)
  const { marks } = useNotebook(nbId)
  const guesses = useMemo(
    () => toNotebookGuesses(state.me.guesses, state.len as Len, state.zero),
    [state.me.guesses, state.len, state.zero],
  )
  const m = playModel(state, store, now, ended)
  const oppName = m.bot ? t('bot.name') : (state.opp?.username ?? '')
  const mySecret = readMySecret(roomId)
  const waiting = m.classic && m.playing && !m.myTurn
  const view: DuelView = {
    state,
    m,
    title: m.bot
      ? t('duel.title.playBot')
      : t('duel.title.play', { format: t(`newGame.format.${state.format}.name`) }),
    oppName,
    clockMs: state.startedAt ? (state.endedAt ?? now) - state.startedAt : 0,
    cur: store.cur,
    sel: store.sel,
    shake: store.shake,
    errCode: store.errCode,
    marks,
    nbId,
    guesses,
    wait: waiting
      ? {
          title: m.bot ? t('duel.play.botThinking') : t('duel.play.oppThinking', { name: oppName }),
          secret: mySecret,
        }
      : null,
    opp: m.classic
      ? oppSection(
          state,
          t('duel.play.oppVs', { name: oppName, secret: mySecret }),
          t('duel.play.noOppGuesses'),
        )
      : undefined,
    input,
    onGiveUp: () => send({ t: 'giveUp' }),
  }
  return { view, store }
}

/** Phones: the solo panel — status with the notebook and sound buttons, signs, keypad; „Предавам се“ in the notebook. */
function DuelMobilePlay({ v }: { v: DuelView }) {
  const { open, show, hide } = useNotesSheet()
  const opener = useRef<HTMLButtonElement>(null)
  const tip = useDueTip(v.m.playing, v.state.me.guesses.length)
  useEffect(() => hide, [hide])
  const close = useCallback(() => {
    sfx.play('page')
    hide()
    opener.current?.focus()
  }, [hide])
  return (
    <section aria-label={v.title} style={COL}>
      <PanelHead
        notes={
          <NotesButton
            buttonRef={opener}
            gameId={v.nbId}
            tip={tip === 'notes'}
            onClick={() => {
              sfx.play('page')
              show()
            }}
          />
        }
      >
        <DuelStatus v={v} />
      </PanelHead>
      <DuelInput v={v} desktop={false} />
      {open ? (
        <NotebookSheet
          gameId={v.nbId}
          guesses={v.guesses}
          left={v.state.me.left}
          onClose={close}
          footer={<DuelGiveUp v={v} />}
        />
      ) : null}
    </section>
  )
}

/** A duel or a bot match in progress: the solo play screen with the opponent strip over the scene. */
export function DuelPlay({ roomId, state, send }: DuelPlayProps) {
  const desktop = useIsDesktop()
  const buzz = useBuzz()
  const { view: v, store } = useDuelView(roomId, state, send)
  const notesOpen = useNotesSheet((s) => s.open)
  useVerdictFeedback(store.verdict, buzz)
  useOppFeedback(store.oppMoved)
  useDuelKeyboard({
    active: v.m.playing && (!v.m.classic || v.m.myTurn) && !notesOpen,
    zero: state.zero,
    press: v.input.press,
    back: v.input.back,
    submit: v.input.submit,
  })
  const oppStrip = (
    <OppStrip state={state} oppName={v.oppName} status={v.m.oppStatus} thinking={v.m.botTurn} />
  )
  const pills = <DuelPills v={v} desktop={desktop} />
  const hud = desktop ? (
    pills
  ) : (
    <PhoneHud
      pills={pills}
      board={<GuessBoard guesses={v.guesses} started={v.m.playing} opp={v.opp} />}
    />
  )
  const strip =
    desktop && v.opp ? (
      <StripStack board={<OppBoard section={v.opp} />} strip={oppStrip} />
    ) : (
      oppStrip
    )

  return (
    <Shell
      scene={playScene(state, store.parity, store.miss)}
      screen="play"
      panelTop={PANEL_TOP}
      fit
      hud={hud}
      strip={strip}
    >
      {desktop ? <DuelDesktopPlay v={v} /> : <DuelMobilePlay v={v} />}
      <OppToast toast={store.toast} name={v.oppName} />
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
        : toast.kind === 'skipped'
          ? t(toast.mine ? 'duel.play.toast.skippedMine' : 'duel.play.toast.skippedOpp', {
              name,
              count: toast.strikesLeft,
            })
          : t('duel.play.toast.race', { name, attempt: toast.attempt })
  return (
    <Overlay>
      <Toast tick={toast.n}>{text}</Toast>
    </Overlay>
  )
}
