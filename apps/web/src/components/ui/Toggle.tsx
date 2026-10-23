import type { ComponentProps } from 'react'
import { cx } from './cx'

export interface ToggleProps extends Omit<ComponentProps<'button'>, 'onChange'> {
  on: boolean
  onChange(v: boolean): void
  label: string
}

/** A native button gives Space/Enter activation for free. */
export function Toggle({ on, onChange, label, className, onClick, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cx('toggle', on && 'on', className)}
      onClick={(e) => {
        onClick?.(e)
        onChange(!on)
      }}
      {...rest}
    />
  )
}
