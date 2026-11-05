import type { LeaderboardRowDto } from '@bc/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { BandChips, SceneCaption } from '../app/layouts/BandChips'
import { Shell } from '../app/layouts/Shell'
import { useSession } from '../features/auth/session'
import { useSendChallenge } from '../features/challenge/useSendChallenge'
import { useLeaderboard } from '../features/stats/useLeaderboard'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { ApiError } from '../lib/api'
import { sfx } from '../lib/sound'
import type { BoardFilterState } from './board/BoardFilters'
import { BoardView, type BoardStatus } from './board/BoardView'
import { ChallengeConfirm } from './board/ChallengeConfirm'
import { BoardSwitch } from './farm/BoardSwitch'
import { IDLE_SCENE } from './idleScene'

const DEFAULT_FILTERS: BoardFilterState = { period: 'today', len: 4, zero: false }

export function Leaderboard() {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const guestSession = useSession(
    (s) => s.session?.user.isGuest === true || s.me?.profile.isGuest === true,
  )
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const board = useLeaderboard(filters.period, filters.len, filters.zero, !guestSession)
  const refused = board.error instanceof ApiError && board.error.code === 'ERR_GUEST'
  const status: BoardStatus =
    guestSession || refused ? 'guest' : board.isError ? 'error' : board.data ? 'ready' : 'loading'
  const [target, setTarget] = useState<LeaderboardRowDto | null>(null)
  const send = useSendChallenge()
  const sendError =
    send.error instanceof ApiError
      ? t(`error.${send.error.code}`, { count: filters.len })
      : send.error
        ? t('error.unknown')
        : null

  function openConfirm(row: LeaderboardRowDto) {
    sfx.play('tap')
    send.reset()
    setTarget(row)
  }
  return (
    <Shell
      scene={IDLE_SCENE}
      screen="board"
      hud={
        desktop ? (
          <SceneCaption text={t('caption.board')} />
        ) : (
          <BandChips title={t('nav.board')} sub={t('common.digits', { count: filters.len })} />
        )
      }
    >
      <BoardSwitch value="all" />
      <BoardView
        status={status}
        filters={filters}
        onFilters={setFilters}
        data={board.data}
        onPlay={() => void navigate('/new')}
        onChallenge={openConfirm}
      />
      {target?.id ? (
        <ChallengeConfirm
          row={target}
          len={filters.len}
          zero={filters.zero}
          sending={send.isPending}
          error={sendError}
          onClose={() => setTarget(null)}
          onSend={(format) =>
            send.mutate({ to: target.id ?? '', len: filters.len, zero: filters.zero, format })
          }
        />
      ) : null}
    </Shell>
  )
}
