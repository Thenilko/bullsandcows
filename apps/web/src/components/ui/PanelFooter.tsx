import type { ComponentProps } from 'react'
import { cx } from './cx'
import styles from './PanelFooter.module.css'

/** Holds a screen's main button (and its error line): pinned to the panel's lower edge on mobile. */
export function PanelFooter({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cx(styles.footer, className)} {...rest} />
}
