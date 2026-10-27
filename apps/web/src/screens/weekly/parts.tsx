import { BADGE_GLYPHS } from '@bc/game-core'
import type { WeeklyRowDto } from '@bc/protocol'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { RankAvatar } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import type { DotState } from '../../features/weekly/weeklyModel'

export const MUTED: CSSProperties = { fontSize: 12, fontWeight: 800, color: 'var(--c-muted-aa)' }
export const KICKER: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '.12em',
  opacity: 0.9,
  textTransform: 'uppercase',
}
const ROW_COLUMNS = '28px 40px minmax(0, 1fr) 56px'
const PLACE_COLORS = ['#B8860B', '#8C98A4', '#9C6B3A'] as const

/** The star of the „Седмичник“ badge in a gold medal (`.md md-gold`). */
export function StarMedal({
  size = 46,
  glyph = 24,
  className,
}: {
  size?: number
  glyph?: number
  className?: string
}) {
  return (
    <span
      className={cx('md', 'md-gold', className)}
      style={{ width: size, height: size, flex: 'none' }}
      aria-hidden="true"
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#2E3B24"
        strokeWidth="2.2"
        strokeLinejoin="round"
      >
        <path d={BADGE_GLYPHS.star} />
      </svg>
    </span>
  )
}

/** One leader (`.lbrow`): place, avatar (with the gold frame), name, attempts. */
export function LeaderRow({ row, name }: { row: WeeklyRowDto; name?: string }) {
  const { t } = useTranslation()
  return (
    <li className={cx('lbrow', row.you && 'you')} style={{ gridTemplateColumns: ROW_COLUMNS }}>
      <span
        style={{
          fontWeight: 900,
          textAlign: 'center',
          color: PLACE_COLORS[row.rank - 1] ?? 'var(--c-muted-aa)',
        }}
      >
        {row.rank}
      </span>
      <RankAvatar
        species={row.avatarSpecies}
        rankKey={row.rankKey}
        size={36}
        gold={row.goldFrame}
      />
      <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.you ? t('common.youNamed', { name: name ?? row.username }) : row.username}
      </b>
      <b style={{ textAlign: 'right' }}>{t('common.attemptsShort', { count: row.attempts })}</b>
    </li>
  )
}

/** `.wk-dots`: tries used, the current one and the rest. */
export function Dots({ dots, label }: { dots: readonly DotState[]; label: string }) {
  return (
    <span className="wk-dots" role="img" aria-label={label}>
      {dots.map((d, i) => (
        <i key={i} className={d || undefined} />
      ))}
    </span>
  )
}
