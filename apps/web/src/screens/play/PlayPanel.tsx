import type { GameViewDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Card, Chip, Hud, Keypad, Slots, Soft } from '../../components/ui'
import type { GameApi } from '../../features/solo/useGame'
import { useAverageAttempts } from '../../features/solo/useDistribution'
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
        marks={{}}
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

function PlayHud({ game, g }: { game: GameViewDto; g: GameApi }) {
  const { t } = useTranslation()
  return (
    <Hud
      items={[
        { label: t('common.attemptsShort', { count: game.attempts }), value: '' },
        { label: t('play.fog', { count: g.left }), value: '' },
        { label: formatClock(g.elapsedSec), value: '' },
      ]}
    />
  )
}

function GiveUp({ g }: { g: GameApi }) {
  const { t } = useTranslation()
  return (
    <Soft small style={GIVE_UP_STYLE} disabled={!g.started || g.finished} onClick={() => void g.giveUp()}>
      {t('notebook.giveUp')}
    </Soft>
  )
}

/** Mobile (M3): one panel over the scene. */
export function MobilePlay({ game, g }: Omit<PlayPanelProps, 'desktop'>) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('play.inputArea')} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PlayHud game={game} g={g} />
      <Status game={game} />
      <Input game={game} g={g} desktop={false} />
      <History guesses={game.guesses} />
      <GiveUp g={g} />
      <Overlay game={game} g={g} desktop={false} />
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
        <PlayHud game={game} g={g} />
        <Input game={game} g={g} desktop />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7560', textAlign: 'center' }}>{t('play.keyboardHint')}</span>
        <Overlay game={game} g={g} desktop />
      </Card>
      <Card style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{t('notebook.attempts')}</h2>
        <History guesses={game.guesses} />
        <GiveUp g={g} />
      </Card>
    </>
  )
}
