import { shareRow, type Len, type ShareRow } from '@bc/game-core'
import { useTranslation } from 'react-i18next'
import { BullHead, BullIcon, CowIcon, HEAD_BOX } from '../../components/ui/characters'
import type { ShareLabels } from './shareLabels'
import type { ShareModel } from './shareModel'

const CELL = 40
const CELL_SMALL = 30
const MANY_ROWS = 8
const HEAD = 22
const HEAD_SMALL = 17
const BULL = '🐂'
const COW = '🐄'

/** The green rounded square of the favicon with the bull head. */
function Logo() {
  return (
    <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true" style={{ flex: 'none' }}>
      <rect width="64" height="64" rx="14" fill="#5E9E46" />
      <svg x="4" y="4" width="56" height="56" viewBox={HEAD_BOX}>
        <BullHead />
      </svg>
    </svg>
  )
}

/** One attempt: bulls, cows, blanks — sorted, never the digits (`shareRow`). */
function Row({ row, len, small }: { row: ShareRow; len: Len; small: boolean }) {
  const cells = Array.from(shareRow(row, len))
  const size = small ? CELL_SMALL : CELL
  const head = small ? HEAD_SMALL : HEAD
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
      {cells.map((c, i) => (
        <span
          key={i}
          className={c === BULL ? 'sh-cell sh-b' : c === COW ? 'sh-cell sh-c' : 'sh-cell'}
          style={small ? { width: size, height: size, borderRadius: 8 } : undefined}
        >
          {c === BULL ? <BullIcon size={head} /> : c === COW ? <CowIcon size={head} /> : null}
        </span>
      ))}
    </div>
  )
}

/** The preview card of the share sheet (Р1, `.sh-card`); the PNG mirrors it. */
export function ShareCard({ model, labels }: { model: ShareModel; labels: ShareLabels }) {
  const { t } = useTranslation()
  const { input } = model
  const small = input.rows.length > MANY_ROWS
  return (
    <div className="sh-card" role="img" aria-label={t('share.cardAria')} data-testid="share-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <b style={{ fontSize: 17 }}>
            {labels.title} <span style={{ color: '#B5452F' }}>{labels.titleAccent}</span>
          </b>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#6B7560' }}>{labels.heading}</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 30, fontWeight: 900 }}>{labels.big}</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#4A5640' }}>{labels.aside}</span>
      </div>
      {input.rows.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 12, borderRadius: 16, background: '#F3EEDF' }}>
          {input.rows.map((row, i) => (
            <Row key={i} row={row} len={input.len} small={small} />
          ))}
        </div>
      ) : null}
      <div style={{ display: 'flex', justifyContent: labels.top ? 'space-between' : 'flex-end', alignItems: 'center', gap: 8 }}>
        {labels.top ? (
          <span style={{ padding: '6px 12px', borderRadius: 12, background: '#B5452F', color: '#FFFFFF', fontWeight: 900, transform: 'rotate(-2deg)' }}>
            {labels.top}
          </span>
        ) : null}
        <span style={{ fontSize: 12, fontWeight: 800, color: '#6B7560' }}>{labels.better}</span>
      </div>
    </div>
  )
}
