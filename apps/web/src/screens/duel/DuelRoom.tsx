import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { Shell } from '../../app/layouts/Shell'
import { Soft } from '../../components/ui'
import { useDuelStore } from '../../features/duel/store'
import { readStoredRoom, useRoom } from '../../features/duel/useRoom'
import { DuelPlay } from './DuelPlay'
import { DuelResult } from './DuelResult'
import { Found } from './Found'
import { HideSecret } from './HideSecret'
import { IDLE_SCENE } from './scenes'

export type RoomView = 'play' | 'result'

/** `/duel/:roomId[/result]` — resolves the seat token, then picks the screen from the match phase. */
export function DuelRoom({ view = 'play' }: { view?: RoomView }) {
  const { roomId = '' } = useParams()
  const [params] = useSearchParams()
  const stored = readStoredRoom()
  const token = params.get('token') ?? (stored?.roomId === roomId ? stored.token : null)
  if (!token) return <Navigate to="/duel/new" replace />
  return <Room roomId={roomId} token={token} view={view} />
}

function Room({ roomId, token, view }: { roomId: string; token: string; view: RoomView }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const room = useRoom(roomId, token)
  const resumedEnded = useDuelStore((s) => s.resumedEnded)
  const phase = room.state?.phase ?? null

  // The seat token lives in sessionStorage now; keep it out of history and referrers.
  const hasTokenParam = params.has('token')
  useEffect(() => {
    if (hasTokenParam) void navigate(`/duel/${encodeURIComponent(roomId)}`, { replace: true })
  }, [hasTokenParam, roomId, navigate])

  // After a rematch the server leaves `ended`: go back to the lobby screens.
  useEffect(() => {
    if (view === 'result' && phase !== null && phase !== 'ended') void navigate(`/duel/${encodeURIComponent(roomId)}`, { replace: true })
  }, [view, phase, roomId, navigate])

  const state = room.state
  if (!state) return <Connecting closed={room.status === 'closed'} />
  const body = pick(view, roomId, state, room.send, resumedEnded)
  return (
    <>
      {room.status === 'reconnecting' ? (
        <p role="status" style={BANNER}>
          {t('common.reconnecting')}
        </p>
      ) : null}
      {body}
    </>
  )
}

const BANNER = { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, margin: 0, padding: '8px 16px', textAlign: 'center', fontWeight: 800, background: '#F2C230', color: '#2E3B24' } as const

function pick(view: RoomView, roomId: string, state: NonNullable<ReturnType<typeof useRoom>['state']>, send: ReturnType<typeof useRoom>['send'], resumedEnded: boolean) {
  if (view === 'result') return state.phase === 'ended' ? <DuelResult roomId={roomId} state={state} send={send} /> : null
  switch (state.phase) {
    case 'lobby':
    case 'countdown':
      return <Found state={state} send={send} />
    case 'secrets':
      return <HideSecret roomId={roomId} state={state} send={send} />
    case 'playing':
      return <DuelPlay roomId={roomId} state={state} send={send} />
    case 'ended':
      return resumedEnded ? <Navigate to={`/duel/${encodeURIComponent(roomId)}/result`} replace /> : <DuelPlay roomId={roomId} state={state} send={send} />
  }
}

function Connecting({ closed }: { closed: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <Shell scene={IDLE_SCENE} screen="duel">
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
        <p role={closed ? 'alert' : 'status'} style={{ margin: 0, fontWeight: 800 }}>
          {t(closed ? 'common.offline' : 'common.loading')}
        </p>
        {closed ? <Soft onClick={() => void navigate('/duel/new')}>{t('duel.toSetup')}</Soft> : null}
      </section>
    </Shell>
  )
}
