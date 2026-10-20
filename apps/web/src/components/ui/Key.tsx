import { forwardRef, type ComponentProps } from 'react'
import type { DigitMark } from './marks'
import { cx } from './cx'

export interface KeyProps extends ComponentProps<'button'> {
  mark?: DigitMark
}

export const Key = forwardRef<HTMLButtonElement, KeyProps>(function Key({ mark = 0, className, type = 'button', ...rest }, ref) {
  return <button ref={ref} type={type} className={cx('key', mark === 1 && 'nx', mark === 2 && 'nok', className)} {...rest} />
})
