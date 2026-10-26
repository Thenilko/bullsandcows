import type { ComponentProps } from 'react'
import { cx } from './cx'

export interface PillProps extends ComponentProps<'button'> {
  on?: boolean
}

export function Pill({ on, className, type = 'button', ...rest }: PillProps) {
  return <button type={type} aria-pressed={on} className={cx('pill', on && 'on', className)} {...rest} />
}
