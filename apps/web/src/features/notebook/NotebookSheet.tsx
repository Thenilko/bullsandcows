import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Notebook, type NotebookProps } from './Notebook'

type SheetProps = Omit<NotebookProps, 'layout'> & { onClose(): void }

const BACKDROP = { position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(30,40,20,.4)' } as const
const SHEET = {
  position: 'fixed',
  left: 0,
  right: 0,
  top: 96,
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
const GRIP = { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#DCD4BF', flex: 'none' } as const

/** Mobile notebook: bottom sheet over the play panel; closes on backdrop tap and Escape. */
export function NotebookSheet(props: SheetProps) {
  const { t } = useTranslation()
  const { onClose } = props
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="fadein" data-testid="notebook-backdrop" style={BACKDROP} onClick={onClose} />
      <section className="sheetup" role="dialog" aria-modal="true" aria-label={t('notebook.title')} style={SHEET}>
        <span style={GRIP} />
        <Notebook {...props} layout="sheet" />
      </section>
    </>
  )
}
