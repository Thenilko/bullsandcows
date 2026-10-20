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
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const

const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 } as const
const FOOT_STYLE = { display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 8 } as const
const ICON_BTN_STYLE = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 } as const

export function Keypad({ len, zero, current, marks, disabled, onPress, onBack, onSubmit }: KeypadProps) {
  const { t } = useTranslation()
  const full = current.length >= len

  function digit(d: string) {
    const blocked = disabled || current.includes(d) || full || (d === '0' && !zero)
    return (
      <Key key={d} mark={marks[d] ?? 0} disabled={blocked} aria-label={t('common.digitAria', { digit: d })} onClick={() => onPress(d)}>
        {d}
      </Key>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={GRID_STYLE}>{ROWS.flat().map(digit)}</div>
      <div style={FOOT_STYLE}>
        <Soft aria-label={t('common.delete')} disabled={disabled || current.length === 0} onClick={onBack} style={ICON_BTN_STYLE}>
          <BackspaceIcon />
        </Soft>
        {digit('0')}
        <Cta disabled={disabled || current.length !== len} onClick={onSubmit} style={{ padding: '0 8px', fontSize: 15 }}>
          {t('play.submit')}
        </Cta>
      </div>
    </div>
  )
}
