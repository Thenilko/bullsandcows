import type { Len } from '@bc/game-core'
import { useTranslation } from 'react-i18next'
import { Cta } from './Cta'
import { BackspaceIcon } from './icons'
import { Key } from './Key'
import type { DigitMark } from './marks'
import { Soft } from './Soft'

export type { DigitMark } from './marks'

export interface KeypadProps {
  len: Len
  zero: boolean
  current: string
  marks: Readonly<Record<string, DigitMark>>
  disabled: boolean
  onPress(d: string): void
  onBack(): void
  onSubmit(): void
  /** Mobile: 8px gap, default key height. Desktop: 10px gap, 56px keys (PasDesktop). */
  layout?: 'mobile' | 'desktop'
  /** Overrides the submit label (default: `play.submit`). */
  submitLabel?: string
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const

const FOOT_STYLE = { display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: 10 } as const
const ICON_BTN_STYLE = { padding: 0 } as const

export function Keypad({ len, zero, current, marks, disabled, onPress, onBack, onSubmit, layout = 'mobile', submitLabel }: KeypadProps) {
  const { t } = useTranslation()
  const full = current.length >= len

  function digit(d: string) {
    const blocked = disabled || current.includes(d) || full || (d === '0' && !zero)
    return (
      <Key key={d} style={layout === 'desktop' ? { height: 56 } : undefined} mark={marks[d] ?? 0} disabled={blocked} aria-label={t('common.digitAria', { digit: d })} onClick={() => onPress(d)}>
        {d}
      </Key>
    )
  }

  const gap = layout === 'desktop' ? 10 : 8
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap }}>{DIGITS.map(digit)}</div>
      <div style={FOOT_STYLE}>
        <Soft
          className="icobtn"
          aria-label={t('common.delete')}
          disabled={disabled || current.length === 0}
          onClick={onBack}
          style={ICON_BTN_STYLE}
        >
          <BackspaceIcon size={layout === 'desktop' ? 20 : 22} />
        </Soft>
        <Cta disabled={disabled || current.length !== len} onClick={onSubmit}>
          {submitLabel ?? t('play.submit')}
        </Cta>
      </div>
    </div>
  )
}
