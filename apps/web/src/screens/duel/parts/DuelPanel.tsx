import type { Len } from '@bc/game-core'
import type { ErrorCode, GuessEntryDto, PublicState } from '@bc/protocol'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { DigitMark } from '../../../components/ui'
import { errorText } from '../../../features/duel/errorText'
import { Notebook } from '../../../features/notebook/Notebook'
import { useDesktopMode } from '../../../hooks/useDesktopMode'
import type { BoardSection } from '../../play/GuessBoard'
import { GameInput, GiveUpButton, PlayStatus } from '../../play/PanelParts'
import { fmtClock } from '../duelUtils'
import type { PlayModel } from '../playModel'
import type { PlayInput } from '../usePlayInput'
import { TurnTimer, TurnWarning } from './TurnTimer'

/** Everything the duel panel shows, derived once in DuelPlay. */
export interface DuelView {
  state: PublicState
  m: PlayModel
  title: string
  oppName: string
  /** The match clock in ms. */
  clockMs: number
  cur: string
  sel: number | null
  shake: number
  errCode: ErrorCode | null
  marks: Readonly<Record<string, DigitMark>>
  nbId: string
  guesses: readonly GuessEntryDto[]
  /** Classic: „Боби мисли“ over the keypad while it is the opponent's turn. */
  wait: { title: string; secret: string } | null
  /** Classic: the opponent's attempts against my number. */
  opp: BoardSection | undefined
  input: PlayInput
  onGiveUp(): void
}

// Darker shades of the design's green/blue so the white tag text meets AA (4.6:1+; the originals are 3.3:1 / 4.2:1).
const TAG_COLORS = { me: '#4A8236', opp: '#4278A8' } as const
const TAG_STYLE = { marginLeft: 8, verticalAlign: 'middle', color: '#FFFFFF' } as const
const TITLE_ROW = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } as const
const HINT = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--c-muted-aa)',
  textAlign: 'center',
} as const
const NOTE = { margin: 0, fontSize: 14, fontWeight: 700, color: '#4A5640' } as const
const PILLS = {
  display: 'flex',
  gap: 8,
  justifyContent: 'space-between',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
} as const
const ELLIPSIS = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const
const NUM = { fontVariantNumeric: 'tabular-nums' } as const
const WAIT = {
  position: 'absolute',
  inset: -6,
  borderRadius: 18,
  background: 'rgba(246,242,230,.92)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
} as const

const myTurnWarning = ({ m }: DuelView) => m.warn && m.msLeft !== null && m.classic && m.myTurn

/** „твой ход“ / „неговият ход“ (classic only). */
function TurnTag({ v }: { v: DuelView }) {
  const { t } = useTranslation()
  if (!v.m.classic) return null
  const turn = v.m.myTurn ? 'me' : 'opp'
  return (
    <span className="tag" style={{ ...TAG_STYLE, background: TAG_COLORS[turn] }}>
      {t(`duel.play.turn.${turn}`)}
    </span>
  )
}

/** Phones: „Опит N“ (+ whose turn) and the last verdict; the turn warning or, before the first guess, the rule. */
export function DuelStatus({ v }: { v: DuelView }) {
  const { t } = useTranslation()
  const { state, m } = v
  const last = state.me.guesses.at(-1)
  const title = (
    <>
      {t('duel.play.attempt', { attempt: state.me.guesses.length + 1 })}
      <TurnTag v={v} />
    </>
  )
  if (myTurnWarning(v))
    return <PlayStatus title={title} line={<TurnWarning msLeft={m.msLeft ?? 0} />} />
  if (last) {
    const line = t('play.last', {
      guess: last.guess,
      bulls: t('common.bull', { count: last.bulls }),
      cows: t('common.cow', { count: last.cows }),
    })
    return <PlayStatus title={title} line={line} />
  }
  if (!m.classic)
    return <PlayStatus title={title} line={t('duel.play.raceNote', { name: v.oppName })} wrap />
  const prompt = t(state.zero ? 'duel.play.promptZero' : 'duel.play.promptNoZero', {
    count: state.len,
  })
  return <PlayStatus title={title} line={prompt} />
}

function WaitOverlay({ wait }: { wait: NonNullable<DuelView['wait']> }) {
  const { t } = useTranslation()
  return (
    <div className="fadein" style={WAIT}>
      <b style={{ fontSize: 18 }}>{wait.title}</b>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#4A5640' }}>
        {t('duel.play.tryingToGuess', { secret: wait.secret })}
      </span>
    </div>
  )
}

/** The solo signs, error line and keypad, locked off my turn (classic) with the wait card over the keys. */
export function DuelInput({ v, desktop }: { v: DuelView; desktop: boolean }) {
  const { t } = useTranslation()
  const { state, m } = v
  const locked = !m.playing || (m.classic && !m.myTurn)
  return (
    <GameInput
      len={state.len as Len}
      zero={state.zero}
      cur={v.cur}
      sel={v.sel}
      shake={v.shake}
      active={!locked}
      disabled={locked}
      error={v.errCode ? errorText(t, v.errCode, state.len) : ''}
      marks={v.marks}
      desktop={desktop}
      keypadOverlay={v.wait ? <WaitOverlay wait={v.wait} /> : undefined}
      onPress={v.input.press}
      onBack={v.input.back}
      onSubmit={v.input.submit}
      onSelect={v.input.select}
    />
  )
}

export function DuelGiveUp({ v }: { v: DuelView }) {
  return <GiveUpButton disabled={!v.m.playing} onClick={v.onGiveUp} />
}

/**
 * Desktop: the solo hanging board (title, whose turn, signs, keypad) and the notebook sheet taped on the right,
 * with „Предавам се“ at its foot (Desk.dc.html, as `DesktopPlay`).
 */
export function DuelDesktopPlay({ v }: { v: DuelView }) {
  const { t } = useTranslation()
  const immersive = useDesktopMode() === 'immersive'
  return (
    <div className="dk-play">
      <span className="dk-rope dk-rope-l" aria-hidden="true" />
      <span className="dk-rope dk-rope-r" aria-hidden="true" />
      <section className="card dk-game" aria-label={v.title}>
        <div style={TITLE_ROW}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{v.title}</h2>
          <TurnTag v={v} />
        </div>
        {myTurnWarning(v) ? <TurnWarning msLeft={v.m.msLeft ?? 0} /> : null}
        {v.m.classic ? null : <p style={NOTE}>{t('duel.play.raceNote', { name: v.oppName })}</p>}
        <DuelInput v={v} desktop />
        <span style={HINT}>{t('play.keyboardHint')}</span>
      </section>
      <section className="card dk-notes" aria-label={t('notebook.title')}>
        <Notebook
          gameId={v.nbId}
          guesses={v.guesses}
          left={v.state.me.left}
          layout={immersive ? 'note' : 'card'}
          footer={<DuelGiveUp v={v} />}
        />
      </section>
    </div>
  )
}

/**
 * The pills over the scene, as the solo game's: phones — the title, the turn timer (classic) and the clock;
 * desktop — the fog, the turn timer and „clock · опит N“.
 */
export function DuelPills({ v, desktop }: { v: DuelView; desktop: boolean }) {
  const { t } = useTranslation()
  const clock = fmtClock(v.clockMs)
  const timer = v.m.msLeft !== null ? <TurnTimer msLeft={v.m.msLeft} warn={v.m.warn} /> : null
  if (desktop) {
    const attempt = v.state.me.guesses.length + 1
    return (
      <div aria-live="polite" style={{ ...PILLS, fontSize: 15 }}>
        <span className="ps-hud">{t('play.fogLong', { count: v.state.me.left })}</span>
        {timer}
        <span className="ps-hud" style={NUM}>
          {t('play.clockAttempt', { clock, attempt })}
        </span>
      </div>
    )
  }
  return (
    <div style={PILLS}>
      <span className="ps-hud" style={ELLIPSIS}>
        {v.title}
      </span>
      <span style={{ display: 'flex', gap: 6, flex: 'none' }}>
        {timer}
        <span className="ps-hud" style={NUM}>
          {clock}
        </span>
      </span>
    </div>
  )
}

/** Desktop: the opponent's plank (classic) stacked above the opponent strip. */
export function StripStack({ board, strip }: { board: ReactNode; strip: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {board}
      {strip}
    </div>
  )
}
