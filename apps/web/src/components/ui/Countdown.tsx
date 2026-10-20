import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface CountdownProps {
  running: boolean
  onDone(): void
  stepMs?: number
  startAtMs?: number
  onTick?(n: 3 | 2 | 1): void
}

const NUMBERS = [3, 2, 1] as const
const NUMBER_STYLE = { fontSize: 130, fontWeight: 900, lineHeight: 1, color: '#FFFFFF', textShadow: '0 6px 0 #B5452F' } as const
const LABEL_STYLE = { fontSize: 20, fontWeight: 900, color: '#FFFFFF' } as const

export function Countdown({ running, onDone, stepMs = 700, startAtMs = 2100, onTick }: CountdownProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const cb = useRef({ onDone, onTick })
  useEffect(() => {
    cb.current = { onDone, onTick }
  })

  useEffect(() => {
    if (!running) return
    const timers: ReturnType<typeof setTimeout>[] = []
    NUMBERS.forEach((n, i) => {
      if (i === 0) cb.current.onTick?.(n)
      else
        timers.push(
          setTimeout(() => {
            setStep(i)
            cb.current.onTick?.(n)
          }, i * stepMs),
        )
    })
    timers.push(
      setTimeout(() => {
        setStep(NUMBERS.length)
        cb.current.onDone()
      }, startAtMs),
    )
    return () => {
      timers.forEach(clearTimeout)
      setStep(0)
    }
  }, [running, stepMs, startAtMs])

  const n = NUMBERS[step]
  if (!running || n === undefined) return null
  return (
    <div className="cd fadein">
      <span key={n} className="boing" style={NUMBER_STYLE}>
        {n}
      </span>
      <span style={LABEL_STYLE}>{t('common.getReady')}</span>
    </div>
  )
}
