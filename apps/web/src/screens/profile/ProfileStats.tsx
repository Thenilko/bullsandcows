import type { MeDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Bar, Card } from '../../components/ui'

const MIN_BAR = 4
const TOP_BUCKET = 10

function Tile({
  value,
  label,
  desktop,
}: {
  value: string | number
  label: string
  desktop: boolean
}) {
  return (
    <Card style={{ padding: desktop ? 18 : '10px 4px' }}>
      <div style={{ fontSize: desktop ? 32 : 22, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: desktop ? undefined : 11, fontWeight: 700, color: 'var(--c-muted-aa)' }}>
        {label}
      </div>
    </Card>
  )
}

export function StatTiles({
  stats,
  desktop = false,
}: {
  stats: MeDto['stats']
  desktop?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: desktop
          ? 'repeat(auto-fit, minmax(140px, 1fr))'
          : 'repeat(4, minmax(0, 1fr))',
        gap: desktop ? 14 : 8,
        textAlign: 'center',
      }}
    >
      <Tile
        value={stats.played}
        label={t(desktop ? 'profile.stat.playedLong' : 'profile.stat.played')}
        desktop={desktop}
      />
      <Tile value={`${stats.winRate}%`} label={t('profile.stat.winRate')} desktop={desktop} />
      <Tile
        value={stats.streak}
        label={t(desktop ? 'profile.stat.streakLong' : 'profile.stat.streak')}
        desktop={desktop}
      />
      <Tile
        value={stats.best ?? '—'}
        label={t(desktop ? 'profile.stat.bestLong' : 'profile.stat.best')}
        desktop={desktop}
      />
    </div>
  )
}

export function BucketChart({
  buckets,
  desktop = false,
}: {
  buckets: MeDto['buckets']
  desktop?: boolean
}) {
  const { t } = useTranslation()
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <Card
      style={{
        padding: desktop ? 24 : 14,
        display: 'flex',
        flexDirection: 'column',
        gap: desktop ? 10 : 6,
      }}
    >
      {desktop ? (
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{t('profile.yourGames')}</h2>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: desktop ? 10 : 6,
          height: desktop ? 120 : 70,
        }}
      >
        {buckets.map((b, i) => (
          <div
            key={b.attempts}
            style={{
              flex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--c-muted-aa)' }}>{b.count || ''}</span>
            <Bar
              h={`${Math.max(MIN_BAR, Math.round((b.count / max) * 100))}%`}
              c="#86C462"
              d={`${(i * 0.05).toFixed(2)}s`}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {buckets.map((b) => (
          <span
            key={b.attempts}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 800,
              color: '#4A5640',
            }}
          >
            {b.attempts >= TOP_BUCKET ? `${TOP_BUCKET}+` : b.attempts}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-muted-aa)', textAlign: 'center' }}>
        {t('profile.chartCaption')}
      </span>
    </Card>
  )
}
