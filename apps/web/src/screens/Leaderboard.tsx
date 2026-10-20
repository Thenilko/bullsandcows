import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { useSession } from '../features/auth/session'
import { useLeaderboard } from '../features/stats/useLeaderboard'
import { ApiError } from '../lib/api'
import type { BoardFilterState } from './board/BoardFilters'
import { BoardView, type BoardStatus } from './board/BoardView'
import { IDLE_SCENE } from './idleScene'

const DEFAULT_FILTERS: BoardFilterState = { period: 'today', len: 4, zero: false }

export function Leaderboard() {
  const navigate = useNavigate()
  const guestSession = useSession(
    (s) => s.session?.user.isGuest === true || s.me?.profile.isGuest === true,
  )
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const board = useLeaderboard(filters.period, filters.len, filters.zero, !guestSession)
  const refused = board.error instanceof ApiError && board.error.code === 'ERR_GUEST'
  const status: BoardStatus =
    guestSession || refused ? 'guest' : board.isError ? 'error' : board.data ? 'ready' : 'loading'
  return (
    <Shell scene={IDLE_SCENE} sceneSide>
      <BoardView
        status={status}
        filters={filters}
        onFilters={setFilters}
        data={board.data}
        onPlay={() => void navigate('/new')}
      />
    </Shell>
  )
}
