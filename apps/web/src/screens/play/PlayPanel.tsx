import type { GameViewDto } from '@bc/protocol'
import { useCallback, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useIsCompact } from '../../hooks/useViewport'
import { Card, Chip, Hud, Keypad, NotebookIcon, Slots, Soft } from '../../components/ui'
import { Notebook } from '../../features/notebook/Notebook'
import { NotebookSheet } from '../../features/notebook/NotebookSheet'
import { countNotes, useNotebook } from '../../features/notebook/store'
import type { GameApi } from '../../features/solo/useGame'
import { useAverageAttempts } from '../../features/solo/useDistribution'
import { sfx } from '../../lib/sound'
import { errorText, formatClock } from './format'
import { History } from './History'
import { StartOverlay } from './StartOverlay'

export interface PlayPanelProps {
  game: GameViewDto
  g: GameApi
  desktop: boolean
}

const ERR_STYLE = { margin: 0, minHeight: 16, textAlign: 'center', fontWeight: 800, color: '#8A1F0B' } as const
const GIVE_UP_STYLE = { color: '#8A1F0B' } as const

function useStartInfo(game: GameViewDto): string {
  const { t } = useTranslation()
  const avg = useAverageAttempts(game.len, game.zero, game.kind)
  const digits = t('common.digits', { count: game.len })
  const mode = t(`play.mode.${game.kind}`)
  return avg === undefined ? `${digits} · ${mode}` : t('play.startInfo', { digits, mode, avg: avg.toFixed(1) })
}

function Status({ game }: { game: GameViewDto }) {
  const { t } = useTranslation()
  const last = game.guesses.at(-1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span style={{ fontWeight: 900, fontSize: 15 }}>
        {t('play.attemptMode', { attempt: game.attempts + 1, mode: t(`play.mode.${game.kind}`) })}
      </span>
      {last ? (
        <span style={{ fontWeight: 700, fontSize: 13, color: '#4A5640' }}>
          {t('play.last', { guess: last.guess, bulls: t('common.bull', { count: last.bulls }), cows: t('common.cow', { count: last.cows }) })}
        </span>
      ) : null}
      {game.practice ? <Chip style={{ alignSelf: 'flex-start', marginTop: 4, padding: '2px 8px', fontSize: 12 }}>{t('common.practice')}</Chip> : null}
    </div>
  )
}

function Input({ game, g, desktop }: PlayPanelProps) {
  const { t } = useTranslation()
  const { ui } = g
  const { marks } = useNotebook(game.id)
  return (
    <>
      <Slots len={game.len} current={ui.cur} active={g.started} shake={ui.shake} big={desktop} />
      <p role="status" style={{ ...ERR_STYLE, fontSize: desktop ? 14 : 13 }}>
        {errorText(t, ui.err, game.len, ui.cur)}
      </p>
      <Keypad
        len={game.len}
        zero={game.zero}
        current={ui.cur}
        marks={marks}
        disabled={!g.started || g.finished}
        onPress={g.press}
        onBack={g.back}
        onSubmit={() => void g.submit()}
        layout={desktop ? 'desktop' : 'mobile'}
      />
    </>
  )
}

function Overlay({ game, g, desktop }: PlayPanelProps) {
  const info = useStartInfo(game)
  const compact = useIsCompact() && !desktop
  if (g.started) return null
  return (
    <StartOverlay
      desktop={desktop}
      compact={compact}
      info={info}
      running={g.ui.countdown === 'running'}
      onBegin={g.beginCountdown}
      onDone={() => void g.start()}
    />
  )
}

function GiveUp({ g, className }: { g: GameApi; className?: string }) {
  const { t } = useTranslation()
  return (
    <Soft small className={className} style={GIVE_UP_STYLE} disabled={!g.started || g.finished} onClick={() => void g.giveUp()}>
      {t('notebook.giveUp')}
    </Soft>
  )
}

const NOTES_BTN_STYLE = { position: 'relative', marginLeft: 'auto' } as const
const NOTES_BADGE_STYLE = {
  position: 'absolute',
  top: -4,
  right: -4,
  minWidth: 18,
  height: 18,
  padding: '0 4px',
  borderRadius: 9,
  background: '#B5452F',
  color: '#FFFFFF',
  fontSize: 11,
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

function NotesButton({ gameId, onClick, buttonRef }: { gameId: string; onClick(): void; buttonRef: RefObject<HTMLButtonElement | null> }) {
  const { t } = useTranslation()
  const count = countNotes(useNotebook(gameId))
  return (
    <button ref={buttonRef} type="button" className="iconbox icobtn" style={NOTES_BTN_STYLE} aria-label={t('notebook.title')} onClick={onClick}>
      <NotebookIcon />
      {count > 0 ? <span aria-hidden="true" style={NOTES_BADGE_STYLE}>{count}</span> : null}
    </button>
  )
}

/** Mobile (M3): one panel over the scene; the notebook (M4) opens as a bottom sheet. */
export function MobilePlay({ game, g, notesOpen = false }: Omit<PlayPanelProps, 'desktop'> & { notesOpen?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(notesOpen)
  const opener = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    sfx.play('page')
    setOpen(false)
    opener.current?.focus()
  }, [])
  return (
    <section aria-label={t('play.inputArea')} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--panel-gap, 10px)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Status game={game} />
        <NotesButton
          buttonRef={opener}
          gameId={game.id}
          onClick={() => {
            sfx.play('page')
            setOpen(true)
          }}
        />
      </div>
      <Input game={game} g={g} desktop={false} />
      <History guesses={game.guesses} />
      {/* Compact phones: the notebook sheet's footer carries it (MK3 keeps the keypad fully visible). */}
      <GiveUp g={g} className="cmp-hide" />
      <Overlay game={game} g={g} desktop={false} />
      {open ? <NotebookSheet gameId={game.id} guesses={game.guesses} left={g.left} onClose={close} footer={<GiveUp g={g} />} /> : null}
    </section>
  )
}

/** Desktop (D3): input card and attempts card in the right column. */
export function DesktopPlay({ game, g }: Omit<PlayPanelProps, 'desktop'>) {
  const { t } = useTranslation()
  return (
    <>
      <Card aria-label={t('play.inputArea')} style={{ position: 'relative', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{t(`play.modeTitle.${game.kind}`)}</h2>
          {game.practice ? <Chip>{t('common.practice')}</Chip> : null}
        </div>
          <Input game={game} g={g} desktop />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-muted-aa)', textAlign: 'center' }}>{t('play.keyboardHint')}</span>
        <Overlay game={game} g={g} desktop />
      </Card>
      <Card role="region" aria-label={t('notebook.title')} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Notebook gameId={game.id} guesses={game.guesses} left={g.left} layout="card" footer={<GiveUp g={g} />} />
      </Card>
    </>
  )
}

const HUD_ROW = { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center' } as const
const EXIT_STYLE = { display: 'flex', alignItems: 'center', gap: 4, minHeight: 32 } as const

function BackChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

/** HUD chips shown over the scene (M3 / D3). */
/** Compact play (MK3): the tab bar is hidden, so „Меню“ in the HUD leads back to the new-game screen. */
function ExitButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <button type="button" className="ps-hud" aria-label={t('play.exitAria')} style={EXIT_STYLE} onClick={() => void navigate('/new')}>
      <BackChevron />
      {t('play.exit')}
    </button>
  )
}

export function PlayHud({ game, g, desktop }: PlayPanelProps) {
  const { t } = useTranslation()
  const compact = useIsCompact() && !desktop
  const clock = formatClock(g.elapsedSec)
  const items = desktop
    ? [
        { label: t('play.fogLong', { count: g.left }), value: '' },
        { label: t('play.clockAttempt', { clock, attempt: game.attempts + 1 }), value: '' },
      ]
    : [
        { label: t('play.fog', { count: g.left }), value: '' },
        { label: clock, value: '' },
      ]
  const hud = <Hud items={items} style={{ ...HUD_ROW, flex: 1, fontSize: desktop ? 15 : undefined }} />
  if (!compact) return hud
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <ExitButton />
      {hud}
    </div>
  )
}
