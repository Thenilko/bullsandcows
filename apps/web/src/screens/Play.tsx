import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { useGame } from '../features/solo/useGame'
import { useKeyboard } from '../features/solo/useKeyboard'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { IDLE_SCENE } from './idleScene'
import { DesktopPlay, MobilePlay, PlayHud } from './play/PlayPanel'

const PANEL_TOP = 356
const PANEL_PADDING = '14px 16px 12px'

function Loading({ failed }: { failed: boolean }) {
  const { t } = useTranslation()
  return (
    <Shell scene={IDLE_SCENE} panelTop={PANEL_TOP}>
      <p role="status" style={{ margin: 0, fontWeight: 800 }}>
        {failed ? t('error.ERR_NOT_FOUND') : t('common.loading')}
      </p>
    </Shell>
  )
}

export function PlayGame({ gameId }: { gameId: string }) {
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const g = useGame(gameId)
  const { game } = g

  useKeyboard({
    enabled: desktop,
    started: g.started,
    onDigit: g.press,
    onBack: g.back,
    onEnter: () => void g.submit(),
    onStart: g.beginCountdown,
  })

  const leaving = game?.finishedAt != null && !g.ui.solved
  useEffect(() => {
    if (leaving) void navigate(`/result/${gameId}`, { replace: true })
  }, [leaving, gameId, navigate])

  if (!game || leaving) return <Loading failed={g.loadFailed} />
  return (
    <Shell
      scene={g.scene}
      panelTop={PANEL_TOP}
      panelPadding={PANEL_PADDING}
      hud={<PlayHud game={game} g={g} desktop={desktop} />}
    >
      {desktop ? <DesktopPlay game={game} g={g} /> : <MobilePlay game={game} g={g} />}
    </Shell>
  )
}

/** /play/:gameId — the solo game: start gate, countdown, guesses. */
export function Play() {
  const { gameId } = useParams()
  if (!gameId) return <Navigate to="/new" replace />
  return <PlayGame key={gameId} gameId={gameId} />
}
