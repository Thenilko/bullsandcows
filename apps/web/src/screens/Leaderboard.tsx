import type { BoardPeriod } from '@bc/protocol'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { BandChips, SceneCaption } from '../app/layouts/BandChips'
import { Shell } from '../app/layouts/Shell'
import { useSession } from '../features/auth/session'
import { useSendChallenge } from '../features/challenge/useSendChallenge'
import { useBoard } from '../features/stats/useBoard'
import { useLeaderboard } from '../features/stats/useLeaderboard'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { ApiError } from '../lib/api'
import { sfx } from '../lib/sound'
import type { BoardFilterState } from './board/BoardFilters'
import { BoardKindChips, parseBoardChoice, type BoardChoice } from './board/BoardKindChips'
import type { ChallengeTarget } from './board/BoardRows'
import { BoardView, type BoardStatus } from './board/BoardView'
import { ChallengeConfirm } from './board/ChallengeConfirm'
import { KindBoard, type KindBoardStatus } from './board/KindBoard'
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
  const [params, setParams] = useSearchParams()
  // Guests only ever see „Точки“: the members' board with the place they would take („Щеше да си №N“).
  const kind: BoardChoice = guestSession ? 'points' : parseBoardChoice(params.get('kind'))
  const [period, setPeriod] = useState<BoardPeriod>('today')
  const board = useLeaderboard(
    filters.period,
    filters.len,
    filters.zero,
    kind === 'points',
    guestSession,
  )
  const other = useBoard(kind === 'points' ? 'duels' : kind, period, kind !== 'points')
  const otherStatus: KindBoardStatus = other.isError ? 'error' : other.data ? 'ready' : 'loading'
  const refused =
    (board.error instanceof ApiError && board.error.code === 'ERR_GUEST') ||
    (other.error instanceof ApiError && other.error.code === 'ERR_GUEST')
  const status: BoardStatus = refused
    ? 'guest'
    : board.isError
      ? 'error'
      : board.data
        ? 'ready'
        : 'loading'
  const [target, setTarget] = useState<ChallengeTarget | null>(null)
  const send = useSendChallenge()
  const sendError =
    send.error instanceof ApiError
      ? t(`error.${send.error.code}`, { count: filters.len })
      : send.error
        ? t('error.unknown')
        : null

  function chooseKind(next: BoardChoice) {
    sfx.play('tap')
    setParams(next === 'points' ? {} : { kind: next }, { replace: true })
  }

  function openConfirm(row: ChallengeTarget) {
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
          <BandChips
            title={t('nav.board')}
            sub={
              kind === 'points'
                ? t('common.digits', { count: filters.len })
                : t(`board.kind.${kind}`)
            }
          />
        )
      }
    >
      <BoardSwitch value="all" />
      {guestSession || refused ? null : <BoardKindChips value={kind} onChange={chooseKind} />}
      {kind === 'points' || refused ? (
        <BoardView
          status={status}
          filters={filters}
          onFilters={setFilters}
          data={board.data}
          onPlay={() => void navigate('/new')}
          onChallenge={guestSession ? undefined : openConfirm}
          guest={guestSession}
        />
      ) : (
        <KindBoard
          kind={kind}
          period={period}
          onPeriod={setPeriod}
          status={otherStatus}
          data={other.data}
          onPlay={() => void navigate('/new')}
          onDuel={() => void navigate('/duel/new')}
          onChallenge={openConfirm}
        />
      )}
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
