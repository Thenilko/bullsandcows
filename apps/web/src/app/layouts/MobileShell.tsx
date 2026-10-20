import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { PastureScene } from '../../components/scene'
import { HomeIcon, QuestionIcon, TrophyIcon, UserIcon } from '../../components/ui/icons'
import { cx } from '../../components/ui/cx'
import styles from './MobileShell.module.css'
import { HUD_GAP_ABOVE_PANEL, isTabActive, TABS, type ShellProps } from './shell.types'

const TAB_ICONS = [HomeIcon, TrophyIcon, UserIcon, QuestionIcon] as const
/** Compact play panel heights from the MK reference row (under 760px, and under 640px of viewport height). */
const COMPACT_PANEL_H = 312
const TINY_PANEL_H = 290

function hudStyle(at: 'top' | 'bottom'): CSSProperties {
  if (at === 'top') return { position: 'absolute', left: 12, right: 12, top: 12 }
  // 100% is the scene box; the strip ends HUD_GAP_ABOVE_PANEL above the panel's edge.
  return { position: 'absolute', left: 12, right: 12, bottom: `calc(100% - var(--panel-top) + ${HUD_GAP_ABOVE_PANEL}px)`, zIndex: 2 }
}

/** The artboard panel top and the compact panel height, read by MobileShell.module.css. */
function playVars(panelTop: number, compactPanelHeight: number | undefined): CSSProperties {
  return {
    '--panel-top-tall': `${panelTop}px`,
    '--panel-h-compact': `${compactPanelHeight ?? COMPACT_PANEL_H}px`,
    '--panel-h-tiny': `${compactPanelHeight ?? TINY_PANEL_H}px`,
  } as CSSProperties
}

export function MobileShell({ scene, children, bare = false, panelTop, compactPanelHeight, hud, hudAt = 'top' }: ShellProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const play = panelTop !== undefined
  return (
    <div className={cx(styles.root, play && styles.play, bare && styles.bare)} style={play ? playVars(panelTop, compactPanelHeight) : undefined}>
      <div className={styles.scene}>
        <PastureScene {...scene} label={t('nav.play')} />
        {hud ? <div style={hudStyle(hudAt)}>{hud}</div> : null}
      </div>
      <main id="main" className={cx('panel', styles.panelBody, bare && styles.panelBare)}>{children}</main>
      {bare ? null : (
        <nav className={cx('tabbar', styles.tabbar)} aria-label={t('nav.main')}>
          {TABS.map((tab, i) => {
            const Icon = TAB_ICONS[i] ?? HomeIcon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => cx('tab', isTabActive(tab, pathname, isActive) && 'on')}
              >
                <Icon />
                {t(tab.key)}
              </NavLink>
            )
          })}
        </nav>
      )}
    </div>
  )
}
