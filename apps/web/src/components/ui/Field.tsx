import { forwardRef, useId, type ComponentProps } from 'react'
import { cx } from './cx'

export interface FieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
}

const ERROR_STYLE = { margin: '4px 0 0', fontWeight: 800, fontSize: 13, color: '#8A1F0B' } as const

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, className, id, ...rest }, ref) {
  const auto = useId()
  const inputId = id ?? auto
  const errId = `${inputId}-err`
  return (
    <div>
      <input
        ref={ref}
        id={inputId}
        className={cx('field', className)}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        {...rest}
      />
      {error ? (
        <p id={errId} role="alert" style={ERROR_STYLE}>
          {error}
        </p>
      ) : null}
    </div>
  )
})
