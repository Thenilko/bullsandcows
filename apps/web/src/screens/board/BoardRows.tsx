import type { LeaderboardRowDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { cx } from '../../components/ui/cx'
import { RankAvatar } from '../../components/ui/RankAvatar'

const FIRST_LIST_RANK = 4
const ROW_AVATAR = 30

const WIDE_COLUMNS = '50px 36px minmax(0, 1fr) 80px 90px'
const HEAD = { fontSize: 12, fontWeight: 900, letterSpacing: '.06em', color: 'var(--c-muted-aa)' } as const

function WideHeader() {
  const { t } = useTranslation()
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: WIDE_COLUMNS,
        gap: 10,
        padding: '0 12px 6px',
        ...HEAD,
      }}
    >
      <span>{t('board.col.place')}</span>
      <span />
      <span>{t('board.col.player')}</span>
      <span style={{ textAlign: 'right' }}>{t('board.col.attempts')}</span>
      <span style={{ textAlign: 'right' }}>{t('board.col.points')}</span>
    </div>
  )
}

/** Rows from the 4th place down (the podium shows the first three). */
export function BoardRows({
  rows,
  wide = false,
}: {
  rows: readonly LeaderboardRowDto[]
  /** Desktop table: header labels and a plain attempts column. */
  wide?: boolean
}) {
  const { t } = useTranslation()
  const rest = rows.filter((r) => r.rank >= FIRST_LIST_RANK)
  const cols = wide ? WIDE_COLUMNS : undefined
  return (
    <>
      {wide ? <WideHeader /> : null}
      <ol
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {rest.map((r, i) => (
          <li
            key={`${r.rank}-${r.username}`}
            className={cx('lbrow', 'rise', r.you && 'you')}
            style={{
              animationDelay: `${(0.2 + i * 0.04).toFixed(2)}s`,
              ...(wide ? { gridTemplateColumns: cols, gap: 10 } : {}),
            }}
          >
            <span style={{ fontWeight: 900, color: 'var(--c-muted-aa)', textAlign: 'center' }}>{r.rank}</span>
            <RankAvatar species={r.avatarSpecies} rankKey={r.rankKey} size={ROW_AVATAR} />
            <span
              style={{
                fontWeight: 800,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {r.username}
            </span>
            <span style={{ fontWeight: 700, color: '#4A5640', textAlign: 'right', fontSize: 13 }}>
              {wide ? r.attempts : t('common.attemptsShort', { count: r.attempts })}
            </span>
            <span style={{ fontWeight: 900, textAlign: 'right' }}>{r.score}</span>
          </li>
        ))}
      </ol>
    </>
  )
}
