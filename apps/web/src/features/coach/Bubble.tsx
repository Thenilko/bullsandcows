import { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import styles from './Bubble.module.css'

const GAP = 12
const EDGE = 12
const MAX_W = 280

interface Place {
  readonly style: CSSProperties
  readonly tailX: number
}

/** Fixed coordinates next to the anchor; the bubble stays inside the viewport and the tail points at its centre. */
function placeNear(anchor: DOMRect, side: 'above' | 'below'): Place {
  const width = Math.min(MAX_W, window.innerWidth - 2 * EDGE)
  const centre = anchor.left + anchor.width / 2
  const left = Math.min(Math.max(centre - width / 2, EDGE), window.innerWidth - width - EDGE)
  const vertical: CSSProperties =
    side === 'above'
      ? { bottom: window.innerHeight - anchor.top + GAP }
      : { top: anchor.bottom + GAP }
  return { style: { ...vertical, left, width }, tailX: centre - left }
}

export interface BubbleProps {
  /** What the tail points at. */
  anchor: RefObject<HTMLElement | null>
  /** The bubble sits above the anchor (tail down) or below it (tail up). */
  side: 'above' | 'below'
  children: ReactNode
  onDismiss(): void
  testId?: string
}

/**
 * A speech bubble with a tip and „Разбрах“. Rendered into `document.body`, so the panel's scrolling and the
 * scene's clipping never cut it; it follows the anchor on resize and scroll.
 */
export function Bubble({ anchor, side, children, onDismiss, testId }: BubbleProps) {
  const { t } = useTranslation()
  const [place, setPlace] = useState<Place | null>(null)

  // A passive effect: the anchor may be the parent element, whose ref is attached after a child's layout effects.
  useEffect(() => {
    const update = () => {
      const el = anchor.current
      if (el) setPlace(placeNear(el.getBoundingClientRect(), side))
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchor, side])

  if (!place) return null
  return createPortal(
    <div
      role="note"
      className={styles.bubble}
      data-point={side === 'above' ? 'down' : 'up'}
      data-testid={testId}
      style={{ ...place.style, '--tail-x': `${place.tailX}px` } as CSSProperties}
    >
      <div className={styles.text}>{children}</div>
      <button type="button" className={styles.ok} onClick={onDismiss}>
        {t('coach.ok')}
      </button>
    </div>,
    document.body,
  )
}
