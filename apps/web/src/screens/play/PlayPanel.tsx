import type { GameViewDto } from '@bc/protocol'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  Card,
  Chip,
  Hud,
  Keypad,
  Slots,
  Soft,
} from '../../components/ui'
import { SoundIconButton } from '../../components/ui/SoundIconButton'
import { Notebook } from '../../features/notebook/Notebook'
import { NotebookSheet } from '../../features/notebook/NotebookSheet'
import { NotesButton } from '../../features/notebook/NotesButton'
import { useNotebook } from '../../features/notebook/store'
import type { GameApi } from '../../features/solo/useGame'
import { useAverageAttempts } from '../../features/solo/useDistribution'
import { sfx } from '../../lib/sound'
import { errorText, formatClock } from './format'
import { StartOverlay } from './StartOverlay'

export interface PlayPanelProps {
  game: GameViewDto
  g: GameApi
  desktop: boolean
}

const ERR_STYLE = {
  margin: 0,
  minHeight: 16,
  textAlign: 'center',
  fontWeight: 800,
  color: '#8A1F0B',
} as const
const GIVE_UP_STYLE = { color: '#8A1F0B' } as const
const ELLIPSIS = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const

function useStartInfo(game: GameViewDto): string {
  const { t } = useTranslation()
  const avg = useAverageAttempts(game.len, game.zero, game.kind)
  const digits = t('common.digits', { count: game.len })
  const mode = t(`play.mode.${game.kind}`)
  return avg === undefined
    ? `${digits} · ${mode}`
    : t('play.startInfo', { digits, mode, avg: avg.toFixed(1) })
}

/** „Опит N · режим“ and the last verdict on one line (ellipsis when it does not fit). */
function Status({ game }: { game: GameViewDto }) {
  const { t } = useTranslation()
  const last = game.guesses.at(-1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
      <span style={{ fontWeight: 900, fontSize: 15 }}>
        {t('play.attemptMode', { attempt: game.attempts + 1, mode: t(`play.mode.${game.kind}`) })}
      </span>
      {last ? (
        <span style={{ ...ELLIPSIS, fontWeight: 700, fontSize: 13, color: '#4A5640' }}>
          {t('play.last', {
            guess: last.guess,
            bulls: t('common.bull', { count: last.bulls }),
            cows: t('common.cow', { count: last.cows }),
          })}
        </span>
      ) : null}
      {game.practice ? (
        <Chip style={{ alignSelf: 'flex-start', marginTop: 4, padding: '2px 8px', fontSize: 12 }}>
          {t('common.practice')}
        </Chip>
      ) : null}
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
  if (g.started) return null
  return (
    <StartOverlay
      desktop={desktop}
      info={info}
      running={g.ui.countdown === 'running'}
      onBegin={g.beginCountdown}
      onDone={() => void g.start()}
    />
  )
}

function GiveUp({ g }: { g: GameApi }) {
  const { t } = useTranslation()
  return (
    <Soft
      small
      style={GIVE_UP_STYLE}
      disabled={!g.started || g.finished}
      onClick={() => void g.giveUp()}
    >
      {t('notebook.giveUp')}
    </Soft>
  )
}

/**
 * Mobile (M3 / MK3): status row, signs, keypad. The attempts, the notes and „Предавам се“ live in the notebook
 * sheet (M4 / MK6), so the panel keeps the keypad fully visible on every phone.
 */
export function MobilePlay({
  game,
  g,
  notesOpen = false,
}: Omit<PlayPanelProps, 'desktop'> & { notesOpen?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(notesOpen)
  const opener = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    sfx.play('page')
    setOpen(false)
    opener.current?.focus()
  }, [])
  return (
    <section
      aria-label={t('play.inputArea')}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--panel-gap, 10px)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Status game={game} />
        <NotesButton
          buttonRef={opener}
          gameId={game.id}
          onClick={() => {
            sfx.play('page')
            setOpen(true)
          }}
        />
        <SoundIconButton />
      </div>
      <Input game={game} g={g} desktop={false} />
      <Overlay game={game} g={g} desktop={false} />
      {open ? (
        <NotebookSheet
          gameId={game.id}
          guesses={game.guesses}
          left={g.left}
          onClose={close}
          footer={<GiveUp g={g} />}
        />
      ) : null}
    </section>
  )
}

/** Desktop (D3): input card and attempts card in the right column. */
export function DesktopPlay({ game, g }: Omit<PlayPanelProps, 'desktop'>) {
  const { t } = useTranslation()
  return (
    <>
      <Card
        aria-label={t('play.inputArea')}
        style={{
          position: 'relative',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            {t(`play.modeTitle.${game.kind}`)}
          </h2>
          {game.practice ? <Chip>{t('common.practice')}</Chip> : null}
        </div>
        <Input game={game} g={g} desktop />
        <span
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-muted-aa)', textAlign: 'center' }}
        >
          {t('play.keyboardHint')}
        </span>
        <Overlay game={game} g={g} desktop />
      </Card>
      <Card
        role="region"
        aria-label={t('notebook.title')}
        style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <Notebook
          gameId={game.id}
          guesses={game.guesses}
          left={g.left}
          layout="card"
          footer={<GiveUp g={g} />}
        />
      </Card>
    </>
  )
}

const HUD_ROW = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  justifyContent: 'space-between',
  alignItems: 'center',
} as const

function BackChevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

/** „‹ Меню“: shown by `.ps-exit` only in focus mode (compact phones hide the tab bar); leads to the new-game screen. */
function ExitButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="ps-hud ps-exit"
      aria-label={t('play.exitAria')}
      onClick={() => void navigate('/new')}
    >
      <BackChevron />
      {t('play.exit')}
    </button>
  )
}

/** HUD chips shown over the scene (M3 / D3). */
export function PlayHud({ game, g, desktop }: PlayPanelProps) {
  const { t } = useTranslation()
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
  const hud = (
    <Hud items={items} style={{ ...HUD_ROW, flex: 1, fontSize: desktop ? 15 : undefined }} />
  )
  if (desktop) return hud
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <ExitButton />
      {hud}
    </div>
  )
}
