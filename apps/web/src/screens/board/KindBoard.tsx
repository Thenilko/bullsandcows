import type { BoardDto, BoardKind, BoardPeriod, BoardRowDto } from '@bc/protocol'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Card, Cta, Podium, Seg } from '../../components/ui'
import type { PodiumRow } from '../../components/ui/Podium'
import { cx } from '../../components/ui/cx'
import { RankAvatar } from '../../components/ui/RankAvatar'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { PlayerName, PodiumAction } from './BoardRows'
import styles from './kinds.module.css'

export type KindBoardStatus = 'loading' | 'error' | 'ready'

export interface KindBoardProps {
  kind: BoardKind
  /** „Игри“ only. */
  period: BoardPeriod
  onPeriod(next: BoardPeriod): void
  status: KindBoardStatus
  data?: BoardDto
  /** „Играй сега“ (solo boards' empty state). */
  onPlay(): void
  /** To /duel/new (the duel boards' empty state). */
  onDuel(): void
  onChallenge?(row: BoardRowDto): void
}

const PERIODS: readonly BoardPeriod[] = ['today', 'week', 'month']
const FIRST_LIST_RANK = 4
const ROW_AVATAR = 30
const COLUMNS = '40px 32px minmax(0, 1fr) auto'
const WIDE_COLUMNS = '50px 36px minmax(0, 1fr) 140px'
const NOTE = { margin: 0, fontWeight: 700, color: '#4A5640', lineHeight: 1.45 } as const
const HEAD = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '.06em',
  color: 'var(--c-muted-aa)',
} as const

export const valueLabel = (t: TFunction, kind: BoardKind, value: number): string =>
  t(`board.value.${kind}`, { count: value })

/** The grey line under the value: W–L, head-to-head, the best streak or the level; with a long label. */
function subOf(
  t: TFunction,
  kind: BoardKind,
  r: BoardRowDto,
): { short: string; long?: string } | null {
  const record = { wins: r.wins ?? 0, losses: r.losses ?? 0, draws: r.draws ?? 0 }
  if (kind === 'duels' && r.wins !== undefined)
    return { short: t('board.sub.record', record), long: t('board.sub.recordLong', record) }
  if (kind === 'friends' && r.wins !== undefined) {
    const long = t('board.sub.h2hLong', { ...record, name: r.username })
    return { short: t('board.sub.h2h', record), long }
  }
  if (kind === 'streaks' && r.best !== undefined)
    return { short: t('board.sub.best', { best: r.best }) }
  if (kind === 'herders' || kind === 'friends')
    return { short: t('board.sub.level', { title: t(`rank.${r.rankKey}`), level: r.level }) }
  return null
}

function Value({ kind, row }: { kind: BoardKind; row: BoardRowDto }) {
  const { t } = useTranslation()
  const sub = subOf(t, kind, row)
  return (
    <span className={styles.value}>
      {valueLabel(t, kind, row.value)}
      {sub ? (
        <span className={styles.sub} aria-label={sub.long} title={sub.long}>
          {sub.short}
        </span>
      ) : null}
    </span>
  )
}

function podiumRows(
  data: BoardDto,
  t: TFunction,
  onChallenge?: (row: BoardRowDto) => void,
): PodiumRow[] {
  return data.rows.flatMap((r) =>
    r.rank === 1 || r.rank === 2 || r.rank === 3
      ? [
          {
            rank: r.rank,
            name: r.username,
            score: r.value,
            label: valueLabel(t, data.kind, r.value),
            rankKey: r.rankKey,
            species: r.avatarSpecies,
            gold: r.goldFrame === true,
            action: <PodiumAction row={r} onChallenge={onChallenge} />,
          },
        ]
      : [],
  )
}

function Rows({
  data,
  wide,
  onChallenge,
}: {
  data: BoardDto
  wide: boolean
  onChallenge?(row: BoardRowDto): void
}) {
  const { t } = useTranslation()
  const cols = wide ? WIDE_COLUMNS : COLUMNS
  const rest = data.rows.filter((r) => r.rank >= FIRST_LIST_RANK)
  if (rest.length === 0) return null
  return (
    <>
      {wide ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: cols,
            gap: 10,
            padding: '0 12px 6px',
            ...HEAD,
          }}
        >
          <span>{t('board.col.place')}</span>
          <span />
          <span>{t('board.col.player')}</span>
          <span style={{ textAlign: 'right' }}>{t(`board.valueCol.${data.kind}`)}</span>
        </div>
      ) : null}
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
              gridTemplateColumns: cols,
              gap: 10,
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
            <Value kind={data.kind} row={r} />
          </li>
        ))}
      </ol>
    </>
  )
}

function Empty({ kind, onPlay, onDuel }: Pick<KindBoardProps, 'kind' | 'onPlay' | 'onDuel'>) {
  const { t } = useTranslation()
  const duel = kind === 'duels' || kind === 'friends'
  return (
    <div className={styles.empty}>
      <p style={NOTE}>{t(`board.empty.${kind}`)}</p>
      <Cta onClick={duel ? onDuel : onPlay}>
        {duel ? t(kind === 'friends' ? 'board.duelNow' : 'board.toDuel') : t('board.playNow')}
      </Cta>
    </div>
  )
}

function YourPlace({ data }: { data: BoardDto }) {
  const { t } = useTranslation()
  if (!data.me) return null
  const value = valueLabel(t, data.kind, data.me.value)
  return (
    <Card style={{ padding: '12px 14px', fontWeight: 800 }}>
      {t('board.youValue', { rank: data.me.rank, value })}
    </Card>
  )
}

function Ready({ data, wide, ...rest }: KindBoardProps & { data: BoardDto; wide: boolean }) {
  const { t } = useTranslation()
  const others = data.rows.filter((r) => !r.you)
  // „Приятели“ always lists me; with nobody else it is empty.
  if (data.rows.length === 0 || (data.kind === 'friends' && others.length === 0))
    return <Empty kind={data.kind} onPlay={rest.onPlay} onDuel={rest.onDuel} />
  return (
    <>
      <div style={wide ? { maxWidth: 560, width: '100%', alignSelf: 'center' } : undefined}>
        <Podium rows={podiumRows(data, t, rest.onChallenge)} />
      </div>
      <Rows data={data} wide={wide} onChallenge={rest.onChallenge} />
      <YourPlace data={data} />
    </>
  )
}

function Periods({ period, onPeriod }: Pick<KindBoardProps, 'period' | 'onPeriod'>) {
  const { t } = useTranslation()
  return (
    <Seg
      label={t('board.period')}
      value={period}
      options={PERIODS.map((p) => ({ value: p, label: t(`board.tab.${p}`) }))}
      onChange={onPeriod}
    />
  )
}

function Body(props: KindBoardProps & { wide: boolean }) {
  const { t } = useTranslation()
  const { status, data, kind, wide } = props
  return (
    <>
      {kind === 'games' && !wide ? (
        <Periods period={props.period} onPeriod={props.onPeriod} />
      ) : null}
      {status === 'loading' ? (
        <p role="status" style={NOTE}>
          {t('common.loading')}
        </p>
      ) : null}
      {status === 'error' ? (
        <p role="alert" style={NOTE}>
          {t('error.unknown')}
        </p>
      ) : null}
      {status === 'ready' && data ? <Ready {...props} data={data} wide={wide} /> : null}
    </>
  )
}

/** Дуели, Серии, Пастири, Игри, Приятели: podium, rows from the 4th place, „your place“. */
export function KindBoard(props: KindBoardProps) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const title = t(`board.kindTitle.${props.kind}`)
  if (!desktop) {
    return (
      <section
        aria-label={t('board.title')}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{title}</h1>
        <Body {...props} wide={false} />
      </section>
    )
  }
  return (
    <section
      aria-label={t('board.title')}
      className="card rise"
      style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>{title}</h1>
        {props.kind === 'games' ? (
          <Periods period={props.period} onPeriod={props.onPeriod} />
        ) : null}
      </div>
      <Body {...props} wide />
    </section>
  )
}
