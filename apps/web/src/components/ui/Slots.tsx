import type { Len } from '@bc/game-core'
import { Sign } from './Sign'

export interface SlotsProps {
  len: Len
  current: string
  active: boolean
  /** Increments on every rejected guess; its parity alternates two identical keyframes so the shake replays. */
  shake: number
}

const ROW_STYLE = { display: 'flex', gap: 10, justifyContent: 'center' } as const

export function Slots({ len, current, active, shake }: SlotsProps) {
  const shakeClass = shake ? (shake % 2 ? 'shakeA' : 'shakeB') : undefined
  return (
    <div className={shakeClass} style={ROW_STYLE}>
      {Array.from({ length: len }, (_, i) => {
        const ch = current[i]
        return (
          <Sign key={i} cur={active && i === current.length}>
            {ch ? <span className="boing">{ch}</span> : null}
          </Sign>
        )
      })}
    </div>
  )
}
