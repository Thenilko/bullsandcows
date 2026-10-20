import type { ComponentProps } from 'react'

export interface HudProps extends ComponentProps<'div'> {
  items: readonly { label: string; value: string | number }[]
}

const ROW_STYLE = { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' } as const
const ITEM_STYLE = { fontVariantNumeric: 'tabular-nums' } as const

export function Hud({ items, className, style, ...rest }: HudProps) {
  return (
    <div className={className} style={{ ...ROW_STYLE, ...style }} {...rest}>
      {items.map((it) => (
        <span key={it.label} className="ps-hud" style={ITEM_STYLE}>
          {it.label} <b>{it.value}</b>
        </span>
      ))}
    </div>
  )
}
