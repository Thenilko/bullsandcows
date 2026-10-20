import type { ComponentProps } from 'react'
import { cx } from './cx'

export interface ToastProps extends ComponentProps<'div'> {
  /** Increment to replay the entrance animation (alternates the A/B keyframes). */
  tick?: number
}

export function Toast({ tick = 0, className, ...rest }: ToastProps) {
  return <div role="status" aria-live="polite" className={cx(tick % 2 ? 'toastB' : 'toastA', className)} {...rest} />
}
