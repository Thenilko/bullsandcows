import type { Len } from '@bc/game-core'
import { useTranslation } from 'react-i18next'
import { HOLE, targetSlot } from '../../lib/code'
import { Sign } from './Sign'

export interface SlotsProps {
  len: Len
  /** The code being typed; `_` is an empty slot (see lib/code). */
  current: string
  active: boolean
  /** Increments on every rejected guess; its parity alternates two identical keyframes so the shake replays. */
  shake: number
  /** Desktop: larger signs with a wider gap (PasDesktop D3). */
  big?: boolean
  /** The slot chosen for the next digit. */
  selected?: number | null
  /** Makes the slots tappable: a known digit can go straight into its place. */
  onSelect?(slot: number): void
}

const ROW_STYLE = { display: 'flex', gap: 10, justifyContent: 'center' } as const
const SLOT_BUTTON = {
  padding: 0,
  border: 0,
  background: 'none',
  borderRadius: 10,
  cursor: 'pointer',
} as const

export function Slots({
  len,
  current,
  active,
  shake,
  big = false,
  selected = null,
  onSelect,
}: SlotsProps) {
  const { t } = useTranslation()
  const shakeClass = shake ? (shake % 2 ? 'shakeA' : 'shakeB') : undefined
  const target = targetSlot(current, len, selected)
  return (
    <div className={shakeClass} style={big ? { ...ROW_STYLE, gap: 12 } : ROW_STYLE}>
      {Array.from({ length: len }, (_, i) => {
        const ch = current[i]
        const digit = ch && ch !== HOLE ? ch : null
        const sign = (
          <Sign big={big} cur={active && i === target}>
            {digit ? <span className="boing">{digit}</span> : null}
          </Sign>
        )
        if (!onSelect) return <span key={i}>{sign}</span>
        return (
          <button
            key={i}
            type="button"
            style={SLOT_BUTTON}
            disabled={!active}
            aria-pressed={selected === i}
            aria-label={t(digit ? 'play.slotFilled' : 'play.slotEmpty', { n: i + 1, digit })}
            onClick={() => onSelect(i)}
          >
            {sign}
          </button>
        )
      })}
    </div>
  )
}
