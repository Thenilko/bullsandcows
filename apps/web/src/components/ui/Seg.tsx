import { useRef, type KeyboardEvent } from 'react'
import { cx } from './cx'

export interface SegProps<T extends string> {
  value: T
  options: readonly { value: T; label: string }[]
  onChange(v: T): void
  label?: string
  className?: string
}

export function Seg<T extends string>({ value, options, onChange, label, className }: SegProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: KeyboardEvent, index: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    e.preventDefault()
    const next = (index + step + options.length) % options.length
    const target = options[next]
    if (!target) return
    onChange(target.value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inset', className)}
      style={{ display: 'flex', gap: 4, padding: 4 }}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={cx('seg', o.value === value && 'on')}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
