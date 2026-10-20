import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { PastureScene } from '../../components/scene'
import { HomeIcon, QuestionIcon, TrophyIcon, UserIcon } from '../../components/ui/icons'
import { cx } from '../../components/ui/cx'
import styles from './MobileShell.module.css'
import { HUD_GAP_ABOVE_PANEL, isTabActive, TABS, type ShellProps } from './shell.types'

const TAB_ICONS = [HomeIcon, TrophyIcon, UserIcon, QuestionIcon] as const
/** The artboards are 390x844; panel tops are given in that frame. */
const FRAME_HEIGHT = 844
const DEFAULT_PANEL_TOP = 190
/** How little scene is left on short viewports: sky with the sun, or (play) sun plus the near meadow. */
const MIN_PANEL_TOP = 150
const MIN_PLAY_PANEL_TOP = 170

/**
 * The panel keeps the height it has on the artboard (frame minus top); a shorter viewport takes the
 * difference from the scene, down to the minimum, so the keypad and the main button never need scrolling.
 */
export function panelTopVar(top: number, min: number): string {
  return `clamp(${min}px, calc(100dvh - ${FRAME_HEIGHT - top}px), ${top}px)`
}

function hudStyle(at: 'top' | 'bottom'): CSSProperties {
  if (at === 'top') return { position: 'absolute', left: 12, right: 12, top: 12 }
  // 100% is the scene box; the strip ends HUD_GAP_ABOVE_PANEL above the panel's edge.
  return { position: 'absolute', left: 12, right: 12, bottom: `calc(100% - var(--panel-top) + ${HUD_GAP_ABOVE_PANEL}px)`, zIndex: 2 }
}

export function MobileShell({ scene, children, bare = false, panelTop, panelPadding, hud, hudAt = 'top' }: ShellProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const play = panelTop !== undefined
  const rootStyle = { '--panel-top': panelTopVar(panelTop ?? DEFAULT_PANEL_TOP, play ? MIN_PLAY_PANEL_TOP : MIN_PANEL_TOP) } as CSSProperties
  return (
    <div className={styles.root} style={rootStyle}>
      <div className={cx(styles.scene, play && styles.sceneFit)}>
        <PastureScene {...scene} label={t('nav.play')} />
        {hud ? <div style={hudStyle(hudAt)}>{hud}</div> : null}
      </div>
      <main id="main" className={cx('panel', styles.panelBody, bare && styles.panelBare)} style={panelPadding === undefined ? undefined : { padding: panelPadding }}>{children}</main>
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
