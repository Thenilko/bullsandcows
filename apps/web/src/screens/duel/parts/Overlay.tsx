import type { ReactNode } from 'react'

/** Full-screen, non-interactive layer for toasts and the countdown (the shell panel is smaller). */
export function Overlay({ children }: { children: ReactNode }) {
  return <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 30 }}>{children}</div>
}
