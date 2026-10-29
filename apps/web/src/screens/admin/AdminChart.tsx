import type { AdminDayDto } from '@bc/protocol'
import type { Lang } from '@bc/i18n'
import { useTranslation } from 'react-i18next'
import styles from './admin.module.css'
import { formatDay } from './format'

/** Plot units; the SVG stretches to the card (`preserveAspectRatio="none"`), strokes stay 2px. */
const W = 600
const TOP_H = 150
const GAP = 16
const NEW_H = 34
const H = TOP_H + GAP + NEW_H
const LABEL_EVERY = 7

/** A round axis maximum above `n` (1, 2, 5 × 10ᵏ), never 0. */
export function niceMax(n: number): number {
  if (n <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(n))
  return [1, 2, 5, 10].map((m) => m * p).find((m) => m >= n) ?? 10 * p
}

interface Props {
  days: readonly AdminDayDto[]
  lang: Lang
}

/** Games per day as bars, active players as a line over them, and new profiles as a strip underneath. */
export function AdminChart({ days, lang }: Props) {
  const { t } = useTranslation()
  const step = W / Math.max(days.length, 1)
  const bar = Math.max(step * 0.62, 2)
  const top = niceMax(Math.max(...days.map((d) => Math.max(d.games, d.activeUsers)), 0))
  const newTop = niceMax(Math.max(...days.map((d) => d.newUsers), 0))
  const y = (v: number) => TOP_H - (v / top) * TOP_H
  const x = (i: number) => i * step + step / 2
  const line = days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(d.activeUsers).toFixed(1)}`).join(' ')
  const labelled = (i: number) => i % LABEL_EVERY === (days.length - 1) % LABEL_EVERY

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.legend}>
        <span className={styles.keyGames}>{t('admin.chart.games')}</span>
        <span className={styles.keyActive}>{t('admin.chart.active')}</span>
        <span className={styles.keyNew}>{t('admin.chart.newUsers')}</span>
        <span className={styles.axisMax}>max {top}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={t('admin.chart.aria')} className={styles.svg}>
        <line x1="0" x2={W} y1={y(top / 2)} y2={y(top / 2)} className={styles.gridLine} />
        <line x1="0" x2={W} y1={TOP_H} y2={TOP_H} className={styles.base} />
        <line x1="0" x2={W} y1={H} y2={H} className={styles.gridLine} />
        {days.map((d, i) => (
          <g key={d.date}>
            <title>
              {t('admin.chart.day', {
                date: formatDay(d.date, lang),
                games: d.games,
                active: d.activeUsers,
                newUsers: d.newUsers,
              })}
            </title>
            <rect x={x(i) - step / 2} y="0" width={step} height={H} className={styles.hit} />
            {d.games > 0 ? (
              <rect x={x(i) - bar / 2} y={y(d.games)} width={bar} height={TOP_H - y(d.games)} className={styles.barGames} />
            ) : null}
            {d.newUsers > 0 ? (
              <rect
                x={x(i) - bar / 2}
                y={H - (d.newUsers / newTop) * NEW_H}
                width={bar}
                height={(d.newUsers / newTop) * NEW_H}
                className={styles.barNew}
              />
            ) : null}
          </g>
        ))}
        <path d={line} className={styles.lineActive} />
      </svg>
      <ol className={styles.ticks} aria-hidden="true" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((d, i) => (
          <li key={d.date}>{labelled(i) ? formatDay(d.date, lang) : ''}</li>
        ))}
      </ol>
    </figure>
  )
}
