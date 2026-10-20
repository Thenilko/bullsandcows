import type { MeDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Bar, Card } from '../../components/ui'

const MIN_BAR = 4
const TOP_BUCKET = 10

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <Card style={{ padding: '10px 4px' }}>
      <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7560' }}>{label}</div>
    </Card>
  )
}

export function StatTiles({ stats }: { stats: MeDto['stats'] }) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 8,
        textAlign: 'center',
      }}
    >
      <Tile value={stats.played} label={t('profile.stat.played')} />
      <Tile value={`${stats.winRate}%`} label={t('profile.stat.winRate')} />
      <Tile value={stats.streak} label={t('profile.stat.streak')} />
      <Tile value={stats.best ?? '—'} label={t('profile.stat.best')} />
    </div>
  )
}

export function BucketChart({ buckets }: { buckets: MeDto['buckets'] }) {
  const { t } = useTranslation()
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <Card style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
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
            <span style={{ fontSize: 10, fontWeight: 800, color: '#6B7560' }}>{b.count || ''}</span>
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
      <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7560', textAlign: 'center' }}>
        {t('profile.chartCaption')}
      </span>
    </Card>
  )
}
