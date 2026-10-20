import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { PastureScene } from '../../components/scene'
import { HomeIcon, QuestionIcon, TrophyIcon, UserIcon } from '../../components/ui/icons'
import { cx } from '../../components/ui/cx'
import styles from './MobileShell.module.css'
import { HUD_GAP_ABOVE_PANEL, isTabActive, TABS, type ShellProps } from './shell.types'

const TAB_ICONS = [HomeIcon, TrophyIcon, UserIcon, QuestionIcon] as const
/** Mirrors `.scene { height }` and `.panelBody { top }` in MobileShell.module.css. */
const SCENE_HEIGHT = 380
const DEFAULT_PANEL_TOP = 190

function hudStyle(at: 'top' | 'bottom', panelTop = DEFAULT_PANEL_TOP): CSSProperties {
  if (at === 'top') return { position: 'absolute', left: 12, right: 12, top: 12 }
  return { position: 'absolute', left: 12, right: 12, bottom: SCENE_HEIGHT - panelTop + HUD_GAP_ABOVE_PANEL, zIndex: 2 }
}

export function MobileShell({ scene, children, bare = false, panelTop, panelPadding, hud, hudAt = 'top' }: ShellProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  return (
    <div className={styles.root}>
      <div className={styles.scene}>
        <PastureScene {...scene} label={t('nav.play')} />
        {hud ? <div style={hudStyle(hudAt, panelTop)}>{hud}</div> : null}
      </div>
      <main className={cx('panel', styles.panelBody, bare && styles.panelBare)} style={{ ...(panelTop === undefined ? {} : { top: panelTop }), ...(panelPadding === undefined ? {} : { padding: panelPadding }) }}>{children}</main>
      {bare ? null : (
        <nav className="tabbar" aria-label={t('nav.main')}>
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
