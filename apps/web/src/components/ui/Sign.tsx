import type { ComponentProps } from 'react'
import { cx } from './cx'

export interface SignProps extends ComponentProps<'div'> {
  cur?: boolean
  big?: boolean
}

export function Sign({ cur, big, className, ...rest }: SignProps) {
  return <div className={cx('sign', cur && 'cur', big && 'big', className)} {...rest} />
}
