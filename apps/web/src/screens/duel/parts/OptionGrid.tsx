import { cx } from '../../../components/ui/cx'

export interface OptionItem<T extends string> {
  value: T
  label: string
  desc: string
  disabled?: boolean
}

export interface OptionGridProps<T extends string> {
  label: string
  value: T
  options: readonly OptionItem<T>[]
  onChange(v: T): void
}

/** Two-up choice cards (`.opt`) used for format and opponent selection. */
export function OptionGrid<T extends string>({ label, value, options, onChange }: OptionGridProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={o.disabled}
          className={cx('opt', o.value === value && 'on')}
          style={o.disabled ? { opacity: 0.55 } : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          <small>{o.desc}</small>
        </button>
      ))}
    </div>
  )
}
