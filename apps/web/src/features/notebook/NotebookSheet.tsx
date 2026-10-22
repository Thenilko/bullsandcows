import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { trapTab, useDialogFocus, useEscape } from '../../components/ui/focusTrap'
import { useKeyboardInset } from '../../hooks/useKeyboardInset'
import { Notebook, type NotebookProps } from './Notebook'

type SheetProps = Omit<NotebookProps, 'layout'> & { onClose(): void }

const BACKDROP = {
  position: 'fixed',
  inset: 0,
  zIndex: 40,
  background: 'rgba(30,40,20,.4)',
} as const
// `top` comes from `.nb-sheet` (96px, 48px on compact phones).
const SHEET = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 41,
  background: '#FFFDF6',
  borderRadius: '26px 26px 0 0',
  padding: '10px 18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  overflowY: 'auto',
} as const
const GRIP = {
  alignSelf: 'center',
  width: 44,
  height: 5,
  borderRadius: 3,
  background: '#DCD4BF',
  flex: 'none',
} as const

/** Mobile notebook: bottom sheet over the play panel; closes on backdrop tap and Escape. */
export function NotebookSheet(props: SheetProps) {
  // With the on-screen keyboard open the sheet ends above it, so the notes field stays reachable.
  const keyboard = useKeyboardInset()
  const { t } = useTranslation()
  const { onClose } = props
  const sheet = useRef<HTMLElement>(null)
  useDialogFocus(sheet)
  useEscape(onClose)

  return (
    <>
      <div className="fadein" data-testid="notebook-backdrop" style={BACKDROP} onClick={onClose} />
      <section
        className="sheetup nb-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('notebook.title')}
        tabIndex={-1}
        ref={sheet}
        onKeyDown={trapTab}
        style={{ ...SHEET, bottom: keyboard, outline: 'none' }}
      >
        <span style={GRIP} />
        <Notebook {...props} layout="sheet" />
      </section>
    </>
  )
}
