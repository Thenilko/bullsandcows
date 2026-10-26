import type { ComponentProps } from 'react'
import { cx } from './cx'

export interface ChipProps extends ComponentProps<'div'> {
  fresh?: boolean
}

export function Chip({ fresh, className, ...rest }: ChipProps) {
  return <div className={cx('chip', fresh && 'new', className)} {...rest} />
}
