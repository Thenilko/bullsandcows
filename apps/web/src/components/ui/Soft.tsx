import type { ComponentProps } from 'react'
import { cx } from './cx'

export interface SoftProps extends ComponentProps<'button'> {
  small?: boolean
}

export function Soft({ small, className, type = 'button', ...rest }: SoftProps) {
  return <button type={type} className={cx('soft', small && 'sm', className)} {...rest} />
}
