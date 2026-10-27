import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { gameKey } from '../features/solo/gameKey'
import { useGame } from '../features/solo/useGame'
import { useKeyboard } from '../features/solo/useKeyboard'
import { useWeekly, WEEKLY_KEY } from '../features/weekly/useWeekly'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { IDLE_SCENE } from './idleScene'
import {
  secondsLeft,
  WeeklyDesktopPlay,
  WeeklyHud,
  WeeklyMobilePlay,
} from './weekly/WeeklyPlayView'

/** П7 on the 390×844 artboard: the 360px scene, the panel from 336. */
const PANEL_TOP = 336

function Loading({ failed }: { failed: boolean }) {
  const { t } = useTranslation()
  return (
    <Shell scene={IDLE_SCENE} screen="play" panelTop={PANEL_TOP} fit>
      <p role="status" style={{ margin: 0, fontWeight: 800 }}>
        {failed ? t('weekly.loadFailed') : t('common.loading')}
      </p>
    </Shell>
  )
}

/** One weekly game on the solo machinery; its end (won, lost, out of time) leads back to `/weekly`. */
export function WeeklyGame({ gameId, notesOpen = false }: { gameId: string; notesOpen?: boolean }) {
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const g = useGame(gameId, '/weekly')
  const { game } = g
  const info = game?.weekly

  // Leaving the game (whatever way) makes the week's „today“ and the leaders stale.
  useEffect(() => () => void qc.invalidateQueries({ queryKey: WEEKLY_KEY }), [qc])

  useKeyboard({
    enabled: desktop,
    started: g.started,
    onDigit: g.press,
    onBack: g.back,
    onEnter: () => void g.submit(),
    onStart: g.beginCountdown,
  })

  // The server decides when the time is up; at zero the game is read again and comes back finished.
  const left = info ? secondsLeft(info, g) : null
  const timeUp = left === 0 && !g.finished
  useEffect(() => {
    if (timeUp) void qc.refetchQueries({ queryKey: gameKey(gameId) })
  }, [timeUp, qc, gameId])

  // Finished by the server (time, week, another tab): back to the week. A guess that ended it navigates itself.
  const leaving = game?.finishedAt != null && !g.ui.solved
  useEffect(() => {
    if (!leaving) return
    void qc.invalidateQueries({ queryKey: WEEKLY_KEY })
    void navigate('/weekly', { replace: true })
  }, [leaving, navigate, qc])

  if (!game || !info || leaving) return <Loading failed={g.loadFailed} />
  return (
    <Shell
      scene={g.scene}
      screen="play"
      panelTop={PANEL_TOP}
      fit
      hud={<WeeklyHud info={info} g={g} desktop={desktop} />}
    >
      {desktop ? (
        <WeeklyDesktopPlay game={game} info={info} g={g} />
      ) : (
        <WeeklyMobilePlay game={game} info={info} g={g} notesOpen={notesOpen} />
      )}
    </Shell>
  )
}

/** `/weekly/play` — today's weekly game (П7 / ПД11 / ПДН3); without one, the week screen. */
export function WeeklyPlay() {
  const week = useWeekly()
  const today = week.data?.today
  if (week.isPending) return <Loading failed={false} />
  if (week.isError) return <Loading failed />
  if (!today || today.finished) return <Navigate to="/weekly" replace />
  return <WeeklyGame key={today.gameId} gameId={today.gameId} />
}
