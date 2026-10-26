import type { Len } from '@bc/game-core'
import { Sign } from './Sign'

export interface SlotsProps {
  len: Len
  current: string
  active: boolean
  /** Increments on every rejected guess; its parity alternates two identical keyframes so the shake replays. */
  shake: number
  /** Desktop: larger signs with a wider gap (PasDesktop D3). */
  big?: boolean
}

const ROW_STYLE = { display: 'flex', gap: 10, justifyContent: 'center' } as const

export function Slots({ len, current, active, shake, big = false }: SlotsProps) {
  const shakeClass = shake ? (shake % 2 ? 'shakeA' : 'shakeB') : undefined
  return (
    <div className={shakeClass} style={big ? { ...ROW_STYLE, gap: 12 } : ROW_STYLE}>
      {Array.from({ length: len }, (_, i) => {
        const ch = current[i]
        return (
          <Sign key={i} big={big} cur={active && i === current.length}>
            {ch ? <span className="boing">{ch}</span> : null}
          </Sign>
        )
      })}
    </div>
  )
}
