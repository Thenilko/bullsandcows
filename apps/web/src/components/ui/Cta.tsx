import { forwardRef, type ComponentProps } from 'react'
import { cx } from './cx'

export interface CtaProps extends ComponentProps<'button'> {
  small?: boolean
}

export const Cta = forwardRef<HTMLButtonElement, CtaProps>(function Cta({ small, className, type = 'button', ...rest }, ref) {
  return <button ref={ref} type={type} className={cx('cta', small && 'sm', className)} {...rest} />
})
