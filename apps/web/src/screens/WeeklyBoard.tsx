import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { Soft } from '../components/ui'
import { useSession } from '../features/auth/session'
import { useWeeklyBoard } from '../features/weekly/useWeekly'
import { WeeklyShell } from './Weekly'
import { LeaderRow, MUTED } from './weekly/parts'

/** `/weekly/board/:week` — „Виж класацията“ of П8: the winners of a week, best first (top 50 and you). */
export function WeeklyBoard() {
  const { t } = useTranslation()
  const { week: weekId } = useParams()
  const navigate = useNavigate()
  const username = useSession((s) => s.me?.profile.username ?? '')
  const board = useWeeklyBoard(weekId)
  const data = board.data
  const extra = data?.me && !data.rows.some((r) => r.you) ? data.me : null
  return (
    <WeeklyShell week={data?.week}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
          {data ? t('weekly.board.title', { week: data.week }) : t('weekly.hud.title')}
        </h1>
        {data ? (
          <span style={MUTED}>
            {t('weekly.board.participants', { count: data.participants })}
            {data.finalized ? ` · ${t('weekly.board.final')}` : ''}
          </span>
        ) : null}
      </div>
      {!data ? (
        <p role={board.isError ? 'alert' : 'status'} style={{ fontWeight: 800 }}>
          {board.isError ? t('weekly.loadFailed') : t('common.loading')}
        </p>
      ) : data.rows.length === 0 ? (
        <p style={{ margin: 0, fontWeight: 700, color: '#4A5640' }}>{t('weekly.board.empty')}</p>
      ) : (
        <ol
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            margin: 0,
            padding: '12px 14px',
            listStyle: 'none',
          }}
        >
          {data.rows.map((r) => (
            <LeaderRow key={r.rank} row={r} name={username} />
          ))}
          {extra ? <LeaderRow row={extra} name={username} /> : null}
        </ol>
      )}
      <Soft onClick={() => void navigate('/weekly')}>{t('common.back')}</Soft>
    </WeeklyShell>
  )
}
