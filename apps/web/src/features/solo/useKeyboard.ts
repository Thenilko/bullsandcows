import { useEffect, useRef } from 'react'

export interface KeyboardHandlers {
  enabled: boolean
  started: boolean
  onDigit(d: string): void
  onBack(): void
  onEnter(): void
  onStart(): void
}

const DIGIT = /^[0-9]$/

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

/** Desktop keyboard play (PasDesktop key()): digits, Backspace, Enter; Enter or Space starts the game. */
export function useKeyboard(handlers: KeyboardHandlers): void {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })
  const { enabled } = handlers

  useEffect(() => {
    if (!enabled) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      const h = ref.current
      if (!h.started) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          h.onStart()
        }
        return
      }
      if (DIGIT.test(e.key)) h.onDigit(e.key)
      else if (e.key === 'Backspace') h.onBack()
      else if (e.key === 'Enter') h.onEnter()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
