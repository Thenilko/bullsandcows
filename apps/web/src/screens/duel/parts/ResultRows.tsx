import { useTranslation } from 'react-i18next'
import { Avatar } from './Avatar'

export interface ResultRow {
  name: string
  kind: 'me' | 'human' | 'bot'
  attempts: number
  time: string
  solved: boolean
}

const TAG_SOLVED = { background: '#DCEFD0', color: '#2E5E1E' } as const
const TAG_UNSOLVED = { background: '#ECE5D2', color: '#6B7560' } as const

export function ResultRows({ rows }: { rows: readonly ResultRow[] }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r, i) => (
        <div key={r.kind} className="hrow rise" style={{ padding: 12, animationDelay: `${0.2 + i * 0.1}s` }}>
          <Avatar kind={r.kind} size={38} />
          <b style={{ flex: 1, minWidth: 0 }}>{r.name}</b>
          <span style={{ fontWeight: 800, color: '#4A5640' }}>{t('common.attemptsShort', { count: r.attempts })}</span>
          <span style={{ fontWeight: 800, color: '#4A5640', fontVariantNumeric: 'tabular-nums' }}>{r.time}</span>
          <span className="tag" style={r.solved ? TAG_SOLVED : TAG_UNSOLVED}>
            {t(r.solved ? 'result.solved' : 'result.unsolved')}
          </span>
        </div>
      ))}
    </div>
  )
}
