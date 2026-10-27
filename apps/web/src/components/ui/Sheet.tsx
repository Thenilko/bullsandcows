import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { cx } from './cx'
import { trapTab, useDialogFocus, useEscape } from './focusTrap'

export interface SheetProps {
  label: string
  onClose(): void
  children: ReactNode
  /** Desktop modal width; the phone sheet is always full width. */
  width?: number
  /** Centres the content (the badge detail). */
  centered?: boolean
  testId?: string
  className?: string
  /**
   * `card`: a one-off event (PasExtras П2 / ПД3) — on phones a card over the scene (16px from the edges, top 150),
   * on desktop the modal in the wooden frame at top 110. Default `sheet`: bottom sheet / plain modal at top 60.
   */
  variant?: 'sheet' | 'card'
}

// Phones: above the result sheet (10/11) and the notebook (40/41) it may open over. Desktop: above the
// result modal and its confetti (ResultView: dim 19, modal 20, confetti 21).
const MOBILE_Z = 44
const DESKTOP_Z = 22
const DIM = { position: 'fixed', inset: 0, background: 'rgba(30,40,20,.45)' } as const
const BASE = {
  position: 'fixed',
  background: '#FFFDF6',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  overflowY: 'auto',
  outline: 'none',
} as const
const MOBILE: CSSProperties = {
  ...BASE,
  left: 0,
  right: 0,
  bottom: 0,
  maxHeight: 'calc(100dvh - 64px)',
  borderRadius: '26px 26px 0 0',
  padding: '10px 18px calc(20px + env(safe-area-inset-bottom, 0px))',
}
const DESKTOP: CSSProperties = {
  ...BASE,
  left: 0,
  right: 0,
  top: 60,
  margin: '0 auto',
  maxHeight: 'calc(100dvh - 90px)',
  padding: '24px 28px',
  borderRadius: 30,
  boxShadow: '0 24px 60px rgba(30,40,20,.35)',
}
const MOBILE_CARD: CSSProperties = {
  ...BASE,
  left: 16,
  right: 16,
  top: 'min(150px, max(16px, calc(100dvh - 620px)))',
  maxHeight: 'calc(100dvh - 32px)',
  borderRadius: 26,
  padding: '26px 22px 22px',
  gap: 12,
  boxShadow: '0 24px 60px rgba(30,40,20,.35)',
}
const DESKTOP_CARD: CSSProperties = {
  ...DESKTOP,
  top: 110,
  maxHeight: 'calc(100dvh - 130px)',
  padding: '26px 24px 22px',
  borderRadius: 26,
  gap: 12,
  boxShadow: '0 0 0 8px #8B5E34, 0 0 0 11px #4E321A, 0 30px 60px rgba(20,30,10,.4)',
}
const GRIP = {
  alignSelf: 'center',
  width: 44,
  height: 5,
  borderRadius: 3,
  background: '#DCD4BF',
  flex: 'none',
} as const

/** A bottom sheet on phones, a centred modal on desktop: dim, focus trap, Escape and backdrop close. */
export function Sheet({ label, onClose, children, width = 520, centered = false, testId, className, variant = 'sheet' }: SheetProps) {
  const desktop = useIsDesktop()
  const ref = useRef<HTMLElement>(null)
  useDialogFocus(ref)
  useEscape(onClose)
  const z = desktop ? DESKTOP_Z : MOBILE_Z
  const card = variant === 'card'
  const style: CSSProperties = desktop
    ? { ...(card ? DESKTOP_CARD : DESKTOP), zIndex: z + 1, width: `min(${width}px, calc(100% - 32px))` }
    : { ...(card ? MOBILE_CARD : MOBILE), zIndex: z + 1 }
  return (
    <>
      <div className="fadein" data-testid={testId ? `${testId}-backdrop` : undefined} style={{ ...DIM, zIndex: z }} onClick={onClose} />
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        data-testid={testId}
        className={cx(desktop ? 'rise' : 'sheetup', className)}
        style={centered ? { ...style, alignItems: 'center', textAlign: 'center' } : style}
        onKeyDown={trapTab}
      >
        {desktop || card ? null : <span style={GRIP} />}
        {children}
      </section>
    </>
  )
}
