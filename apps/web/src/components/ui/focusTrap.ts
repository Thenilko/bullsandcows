import { useEffect, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'

const FOCUSABLE =
  'button:not(:disabled), textarea, a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'

/** Keeps Tab / Shift+Tab inside the dialog. */
export function trapTab(e: ReactKeyboardEvent<HTMLElement>): void {
  if (e.key !== 'Tab') return
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE))
  const first = items[0]
  const last = items.at(-1)
  if (!first || !last) return
  const active = document.activeElement
  if (e.shiftKey && (active === first || active === e.currentTarget)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

/** Focuses the dialog on mount and gives the focus back to the opener when it unmounts. */
export function useDialogFocus(dialog: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const opener = document.activeElement
    dialog.current?.focus()
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [dialog])
}

/** Escape closes the dialog. */
export function useEscape(onClose: () => void): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}
