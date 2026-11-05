import type { LeaderboardRowDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { cx } from '../../components/ui/cx'
import { RankAvatar } from '../../components/ui/RankAvatar'
import { formatClock } from '../result/resultModel'
import styles from './challenge.module.css'

const FIRST_LIST_RANK = 4
const ROW_AVATAR = 30

const WIDE_COLUMNS = '50px 36px minmax(0, 1fr) 80px 80px 90px'
const HEAD = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '.06em',
  color: 'var(--c-muted-aa)',
} as const

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
      <span style={{ textAlign: 'right' }}>{t('board.col.time')}</span>
      <span style={{ textAlign: 'right' }}>{t('board.col.points')}</span>
    </div>
  )
}

/** Can be challenged: online, not me, and the server sent the id. */
export const isChallengeable = (r: LeaderboardRowDto): boolean =>
  r.online === true && !r.you && r.id !== undefined

/** Green while the player is in the app. */
export function OnlineDot() {
  const { t } = useTranslation()
  return <span className={styles.dot} role="img" aria-label={t('challenge.online')} />
}

export function ChallengeButton({
  row,
  onChallenge,
}: {
  row: LeaderboardRowDto
  onChallenge(row: LeaderboardRowDto): void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={t('challenge.buttonLabel', { name: row.username })}
      onClick={() => onChallenge(row)}
    >
      {t('challenge.button')}
    </button>
  )
}

/** The podium's line under the name: the dot and the button of an online player (nothing otherwise). */
export function PodiumAction({
  row,
  onChallenge,
}: {
  row: LeaderboardRowDto
  onChallenge?(row: LeaderboardRowDto): void
}) {
  if (row.online !== true || row.you) return null
  return (
    <span className={styles.podium}>
      <OnlineDot />
      {onChallenge && isChallengeable(row) ? (
        <ChallengeButton row={row} onChallenge={onChallenge} />
      ) : null}
    </span>
  )
}

/** The name cell: the name, a green dot while online, and „Предизвикай“ when `onChallenge` is given. */
function PlayerName({
  row,
  onChallenge,
}: {
  row: LeaderboardRowDto
  onChallenge?(row: LeaderboardRowDto): void
}) {
  const online = row.online === true && !row.you
  return (
    <span className={styles.name}>
      <span className={styles.nameLine}>
        <span
          style={{
            fontWeight: 800,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.username}
        </span>
        {online ? <OnlineDot /> : null}
      </span>
      {onChallenge && isChallengeable(row) ? (
        <ChallengeButton row={row} onChallenge={onChallenge} />
      ) : null}
    </span>
  )
}

/** Rows from the 4th place down (the podium shows the first three). */
export function BoardRows({
  rows,
  wide = false,
  onChallenge,
}: {
  rows: readonly LeaderboardRowDto[]
  /** Desktop table: header labels and a plain attempts column. */
  wide?: boolean
  /** „Предизвикай“ next to online players; without it the rows only show who is online. */
  onChallenge?(row: LeaderboardRowDto): void
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
            <span style={{ fontWeight: 900, color: 'var(--c-muted-aa)', textAlign: 'center' }}>
              {r.rank}
            </span>
            <RankAvatar
              species={r.avatarSpecies}
              rankKey={r.rankKey}
              size={ROW_AVATAR}
              gold={r.goldFrame === true}
            />
            <PlayerName row={r} onChallenge={onChallenge} />
            <span style={{ fontWeight: 700, color: '#4A5640', textAlign: 'right', fontSize: 13 }}>
              {wide ? r.attempts : t('common.attemptsShort', { count: r.attempts })}
            </span>
            {wide ? (
              <span
                style={{ fontWeight: 700, color: '#4A5640', textAlign: 'right', fontSize: 13 }}
                data-col="time"
              >
                {r.durationMs == null ? '—' : formatClock(r.durationMs / 1000)}
              </span>
            ) : null}
            <span style={{ fontWeight: 900, textAlign: 'right' }}>{r.score}</span>
          </li>
        ))}
      </ol>
    </>
  )
}
