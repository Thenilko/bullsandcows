import type { GameViewDto, WeeklyGameInfoDto } from '@bc/protocol'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Notebook } from '../../features/notebook/Notebook'
import { NotebookSheet } from '../../features/notebook/NotebookSheet'
import { NotesButton } from '../../features/notebook/NotesButton'
import type { GameApi } from '../../features/solo/useGame'
import { attemptDots } from '../../features/weekly/weeklyModel'
import { useDesktopMode } from '../../hooks/useDesktopMode'
import { sfx } from '../../lib/sound'
import { formatClock } from '../play/format'
import { ExitButton, Gate, GiveUp, Input, Overlay } from '../play/PlayPanel'
import { Dots } from './parts'

const SECS_PER_MIN = 60
const HINT = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--c-muted-aa)',
  textAlign: 'center',
} as const

export interface WeeklyPlayProps {
  game: GameViewDto
  info: WeeklyGameInfoDto
  g: GameApi
}

/** „Седмица N · {правило}“. */
export function useWeeklyTitle(info: WeeklyGameInfoDto): string {
  const { t } = useTranslation()
  return t('weekly.play.title', { week: info.week, rule: t(`weekly.rule.${info.rule.key}`) })
}

/** Seconds left of a timed rule, or null without a time limit (or before the start). */
export function secondsLeft(
  info: WeeklyGameInfoDto,
  g: Pick<GameApi, 'started' | 'elapsedSec'>,
): number | null {
  if (info.rule.timeLimitSecs === null || !g.started) return null
  return Math.max(0, info.rule.timeLimitSecs - g.elapsedSec)
}

/** „Опит N от M“ and the dots. */
function AttemptRow({ game, info }: { game: GameViewDto; info: WeeklyGameInfoDto }) {
  const { t } = useTranslation()
  const max = info.rule.maxAttempts
  const finished = game.finishedAt !== null
  const n = Math.min(max, game.attempts + (finished ? 0 : 1))
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <b style={{ fontSize: 15 }}>{t('weekly.play.attempt', { n, max })}</b>
      <Dots
        dots={attemptDots(game.attempts, max, finished)}
        label={t('weekly.play.dotsAria', { used: game.attempts, max })}
      />
    </div>
  )
}

/** „Тук 0 може да е и първа цифра. След 8 опита играта приключва.“ (+ the time limit). */
function Hint({ info }: { info: WeeklyGameInfoDto }) {
  const { t } = useTranslation()
  const { rule } = info
  const parts = [
    t(rule.zero ? 'weekly.play.zeroHint' : 'weekly.play.noZeroHint'),
    t('weekly.play.limit', { count: rule.maxAttempts }),
    ...(rule.timeLimitSecs === null
      ? []
      : [t('weekly.play.time', { count: Math.round(rule.timeLimitSecs / SECS_PER_MIN) })]),
  ]
  return <span style={HINT}>{parts.join(' ')}</span>
}

/** П7 / MK: the attempts row with the notebook, the signs, the keypad and the hint. */
export function WeeklyMobilePlay({
  game,
  info,
  g,
  notesOpen = false,
}: WeeklyPlayProps & { notesOpen?: boolean }) {
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <AttemptRow game={game} info={info} />
        </div>
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
      <Hint info={info} />
      <Overlay game={game} g={g} desktop={false} />
      <Gate g={g} />
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

/** ПД11 / ПДН3: the hanging board (ropes, one swing) with the notebook taped on the right. */
export function WeeklyDesktopPlay({ game, info, g }: WeeklyPlayProps) {
  const { t } = useTranslation()
  const immersive = useDesktopMode() === 'immersive'
  const title = useWeeklyTitle(info)
  return (
    <div className="dk-play">
      <span className="dk-rope dk-rope-l" aria-hidden="true" />
      <span className="dk-rope dk-rope-r" aria-hidden="true" />
      <section className="card dk-game dk-weekly" aria-label={t('play.inputArea')}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{title}</h1>
        <AttemptRow game={game} info={info} />
        <Input game={game} g={g} desktop />
        <Hint info={info} />
        <Overlay game={game} g={g} desktop />
      </section>
      <section className="card dk-notes" aria-label={t('notebook.title')}>
        <Notebook
          gameId={game.id}
          guesses={game.guesses}
          left={g.left}
          layout={immersive ? 'note' : 'card'}
          footer={<GiveUp g={g} />}
        />
      </section>
      <Gate g={g} />
    </div>
  )
}

/** The chips over the scene: the title and the clock (time left for a timed rule, else the time played). */
export function WeeklyHud({
  info,
  g,
  desktop,
}: {
  info: WeeklyGameInfoDto
  g: GameApi
  desktop: boolean
}) {
  const { t } = useTranslation()
  const title = useWeeklyTitle(info)
  const left = secondsLeft(info, g)
  const clock =
    left === null
      ? formatClock(g.elapsedSec)
      : t('weekly.play.timeLeft', { clock: formatClock(left) })
  const row = (
    <div
      style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
      }}
    >
      <span
        className="ps-hud"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: desktop ? 15 : undefined,
        }}
      >
        {title}
      </span>
      <span
        className="ps-hud"
        data-testid="weekly-clock"
        style={{ fontSize: desktop ? 15 : undefined, flex: 'none' }}
      >
        {clock}
      </span>
    </div>
  )
  if (desktop) return row
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <ExitButton />
      {row}
    </div>
  )
}
