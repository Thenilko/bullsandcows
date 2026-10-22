import type { RankKey } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { CrownIcon } from './icons'
import { Bar } from './Bar'
import { RankAvatar } from './RankAvatar'

export interface PodiumRow {
  rank: 1 | 2 | 3
  name: string
  score: number
  rankKey: RankKey
}

export interface PodiumProps {
  rows: readonly PodiumRow[]
}

const ORDER = [1, 0, 2] as const
const COLORS = ['#F2C230', '#E3E3DF', '#E9B07A'] as const
const HEIGHTS = [96, 70, 56] as const
const WOOD =
  'repeating-linear-gradient(0deg,rgba(90,50,20,.10) 0 2px,rgba(0,0,0,0) 2px 7px), #C48E55'

const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, alignItems: 'end', paddingTop: 6 } as const
const COL_STYLE = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } as const
const AVATAR_STYLE = {
  width: 52,
  height: 52,
  borderRadius: '50%',
  border: '3px solid #FFFFFF',
  boxShadow: '0 3px 8px rgba(30,40,20,.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const
const NAME_STYLE = { fontWeight: 900, fontSize: 13, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const
const PLATE_STYLE = {
  borderRadius: '12px 12px 4px 4px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  paddingTop: 8,
  color: '#FFF8EA',
} as const

export function Podium({ rows }: PodiumProps) {
  const { t } = useTranslation()
  const places = ORDER.map((i) => ({ i, row: rows.find((r) => r.rank === i + 1) })).flatMap((p) => (p.row ? [{ i: p.i, row: p.row }] : []))
  return (
    <div style={GRID_STYLE}>
      {places.map(({ i, row }, k) => {
        const delay = `${0.1 + k * 0.08}s`
        return (
          <div key={row.rank} className="rise" style={{ ...COL_STYLE, animationDelay: delay }}>
            {i === 0 ? <CrownIcon className="shine" /> : null}
            <span style={{ ...AVATAR_STYLE, background: COLORS[i] }}>
              <RankAvatar species="bull" rankKey={row.rankKey} size={46} />
            </span>
            <span style={NAME_STYLE}>{row.name}</span>
            <Bar h={`${HEIGHTS[i]}px`} c={WOOD} d={delay} style={{ ...PLATE_STYLE, borderRadius: '12px 12px 4px 4px' }}>
              <span style={{ fontSize: 24, fontWeight: 900, textShadow: '0 2px 0 rgba(70,40,15,.4)' }}>{row.rank}</span>
              <span style={{ fontSize: 12, fontWeight: 800 }}>
                {t('common.pointsShort', { count: row.score })}
              </span>
            </Bar>
          </div>
        )
      })}
    </div>
  )
}
