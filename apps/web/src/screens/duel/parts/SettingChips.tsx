import type { DuelFormat } from '@bc/protocol'
import { useTranslation } from 'react-i18next'

const CHIP_STYLE = { background: '#FFFFFF', border: '1.5px solid #DCD4BF' } as const
const ROW_STYLE = { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' } as const

export interface SettingChipsProps {
  len: number
  zero: boolean
  format: DuelFormat
  /** Extra chip, e.g. the bot level. */
  extra?: string
}

/** Length / zero / format summary shown on invite, queue and found screens. */
export function SettingChips({ len, zero, format, extra }: SettingChipsProps) {
  const { t } = useTranslation()
  const items = [t('common.digits', { count: len }), t(zero ? 'newGame.chip.zero' : 'newGame.chip.noZero'), t(`newGame.format.${format}.name`)]
  if (extra) items.push(extra)
  return (
    <div style={ROW_STYLE}>
      {items.map((label) => (
        <span key={label} className="tag" style={CHIP_STYLE}>
          {label}
        </span>
      ))}
    </div>
  )
}
