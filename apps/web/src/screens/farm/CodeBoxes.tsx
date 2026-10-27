import { useState, type ChangeEvent, type ClipboardEvent } from 'react'
import { cx } from '../../components/ui/cx'
import { parseInviteCode, sanitizeTyping } from '../duel/parts/joinCode'

const LENGTH = 5

export interface CodeBoxesProps {
  value: string
  onChange(value: string): void
  label: string
  id?: string
  invalid?: boolean
  describedBy?: string
}

/**
 * The five `.codebox` cells of Р5 over one real input (typing, pasting a code or the whole `/ferma/…` link,
 * Cyrillic look-alikes swapped). The box after the last character is the cursor while the field has focus.
 */
export function CodeBoxes({ value, onChange, label, id = 'farm-code', invalid = false, describedBy }: CodeBoxesProps) {
  const [focused, setFocused] = useState(false)
  const cells = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '')
  return (
    <div style={{ position: 'relative', display: 'flex', gap: 8, justifyContent: 'center' }}>
      {cells.map((ch, i) => (
        <span key={i} className={cx('codebox', focused && i === Math.min(value.length, LENGTH - 1) && 'cur')} aria-hidden="true">
          {ch}
        </span>
      ))}
      <input
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value}
        lang="en"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        maxLength={64}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(sanitizeTyping(e.target.value, 'ferma'))}
        onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
          const code = parseInviteCode(e.clipboardData.getData('text'), 'ferma')
          if (!code) return
          e.preventDefault()
          onChange(code)
        }}
        style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, fontSize: 16, cursor: 'text' }}
      />
    </div>
  )
}

/** The code typed so far, when it is a valid one. */
export const farmCodeOf = (value: string): string | null => parseInviteCode(value, 'ferma')
