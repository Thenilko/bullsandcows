import type { ComponentProps } from 'react'
import { cx } from './cx'
import { BadgeGlyph, type BadgeVariant } from './icons'

export interface BadgeProps extends ComponentProps<'div'> {
  variant: BadgeVariant
  /** Background of the round icon holder. */
  bg: string
  name: string
  locked?: boolean
  /** Small caption under the name (desktop). */
  desc?: string
  /** Diameter of the round icon holder; defaults to 40. */
  size?: number
}

const HOLDER_STYLE = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

export function Badge({
  variant,
  bg,
  name,
  locked,
  desc,
  size = 40,
  className,
  ...rest
}: BadgeProps) {
  return (
    <div className={cx('badge', locked && 'locked', className)} {...rest}>
      <span style={{ ...HOLDER_STYLE, width: size, height: size, background: bg }}>
        <BadgeGlyph variant={variant} />
      </span>
      <span>{name}</span>
      {desc ? (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#5C6651' }}>{desc}</span>
      ) : null}
    </div>
  )
}
