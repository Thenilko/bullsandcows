import type { LeaderboardRowDto, PhantomPlaceDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { cx } from '../../components/ui/cx'
import { RankAvatar } from '../../components/ui/RankAvatar'
import { formatClock } from '../result/resultModel'
import styles from './challenge.module.css'
import { PhantomRow } from './GuestBoard'

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

/** What „Предизвикай“ needs of a row, on „Точки“ and on the other boards alike. */
export type ChallengeTarget = Pick<
  LeaderboardRowDto,
  'username' | 'avatarSpecies' | 'rankKey' | 'goldFrame' | 'id' | 'online' | 'playing' | 'you'
>

/** Can be challenged: online, not me, and the server sent the id. */
export const isChallengeable = (r: ChallengeTarget): boolean =>
  r.online === true && !r.you && r.id !== undefined

/** Green while the player is in the app. */
export function OnlineDot() {
  const { t } = useTranslation()
  return <span className={styles.dot} role="img" aria-label={t('challenge.online')} />
}

/** In a game, a duel or matchmaking right now: „играе“ next to the dot (they can still be challenged). */
export function PlayingTag({ name }: { name: string }) {
  const { t } = useTranslation()
  return (
    <span className={styles.playing} title={t('challenge.playingLabel', { name })}>
      {t('challenge.playing')}
    </span>
  )
}

/** The dot of an online player, with „играе“ when they are in a game. */
function Presence({ row }: { row: ChallengeTarget }) {
  return (
    <>
      <OnlineDot />
      {row.playing === true ? <PlayingTag name={row.username} /> : null}
    </>
  )
}

export function ChallengeButton<R extends ChallengeTarget>({
  row,
  onChallenge,
}: {
  row: R
  onChallenge(row: R): void
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
export function PodiumAction<R extends ChallengeTarget>({
  row,
  onChallenge,
}: {
  row: R
  onChallenge?(row: R): void
}) {
  if (row.online !== true || row.you) return null
  return (
    <span className={styles.podium}>
      <span className={styles.nameLine}>
        <Presence row={row} />
      </span>
      {onChallenge && isChallengeable(row) ? (
        <ChallengeButton row={row} onChallenge={onChallenge} />
      ) : null}
    </span>
  )
}

/** The name cell: the name, a green dot while online, and „Предизвикай“ when `onChallenge` is given. */
export function PlayerName<R extends ChallengeTarget>({
  row,
  onChallenge,
}: {
  row: R
  onChallenge?(row: R): void
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
        {online ? <Presence row={row} /> : null}
      </span>
      {onChallenge && isChallengeable(row) ? (
        <ChallengeButton row={row} onChallenge={onChallenge} />
      ) : null}
    </span>
  )
}

/** Where the guest's row goes among the listed rows: before the first member it would push down. */
export function phantomIndex(rest: readonly LeaderboardRowDto[], phantom: PhantomPlaceDto): number {
  const at = rest.findIndex((r) => r.rank >= phantom.rank)
  return at === -1 ? rest.length : at
}

/** Rows from the 4th place down (the podium shows the first three). */
export function BoardRows({
  rows,
  wide = false,
  onChallenge,
  phantom,
}: {
  rows: readonly LeaderboardRowDto[]
  /** Desktop table: header labels and a plain attempts column. */
  wide?: boolean
  /** „Предизвикай“ next to online players; without it the rows only show who is online. */
  onChallenge?(row: LeaderboardRowDto): void
  /** A guest's „would be“ place, drawn as a dashed row where it would stand (a podium place: on top). */
  phantom?: PhantomPlaceDto | null
}) {
  const { t } = useTranslation()
  const rest = rows.filter((r) => r.rank >= FIRST_LIST_RANK)
  const cols = wide ? WIDE_COLUMNS : undefined
  const ghostAt = phantom ? phantomIndex(rest, phantom) : -1
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
        {rest.flatMap((r, i) => [
          ...(i === ghostAt && phantom
            ? [<PhantomRow key="phantom" phantom={phantom} wide={wide} columns={cols} />]
            : []),
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
          </li>,
        ])}
        {phantom && ghostAt === rest.length ? (
          <PhantomRow phantom={phantom} wide={wide} columns={cols} />
        ) : null}
      </ol>
    </>
  )
}
