import type { ComponentProps } from 'react'
import { cx } from './cx'

export interface BarProps extends Omit<ComponentProps<'div'>, 'color'> {
  /** CSS height, e.g. `64%` or `96px`. */
  h: string
  /** Fill colour. */
  c: string
  /** Animation delay, e.g. `.15s`. */
  d?: string
}

export function Bar({ h, c, d, className, style, ...rest }: BarProps) {
  return <div className={cx('bar', className)} style={{ width: '100%', height: h, background: c, animationDelay: d, ...style }} {...rest} />
}
