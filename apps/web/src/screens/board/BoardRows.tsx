import type { LeaderboardRowDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { cx } from '../../components/ui/cx'

export const AVATAR_COLORS = [
  '#B5452F',
  '#5E9E46',
  '#C48E55',
  '#4A7FB0',
  '#8E5BA8',
  '#D08A2E',
] as const
const FIRST_LIST_RANK = 4

const AVATAR = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 900,
  fontSize: 13,
  color: '#FFFFFF',
} as const

/** Rows from the 4th place down (the podium shows the first three). */
export function BoardRows({ rows }: { rows: readonly LeaderboardRowDto[] }) {
  const { t } = useTranslation()
  const rest = rows.filter((r) => r.rank >= FIRST_LIST_RANK)
  return (
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
          style={{ animationDelay: `${(0.2 + i * 0.04).toFixed(2)}s` }}
        >
          <span style={{ fontWeight: 900, color: '#6B7560', textAlign: 'center' }}>{r.rank}</span>
          <span
            aria-hidden="true"
            style={{ ...AVATAR, background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
          >
            {Array.from(r.username)[0] ?? '?'}
          </span>
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
            {t('common.attemptsShort', { count: r.attempts })}
          </span>
          <span style={{ fontWeight: 900, textAlign: 'right' }}>{r.score}</span>
        </li>
      ))}
    </ol>
  )
}
