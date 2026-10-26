import type { ComponentProps } from 'react'
import { cx } from './cx'

export function Inset({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cx('inset', className)} {...rest} />
}
