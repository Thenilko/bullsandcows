import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { PastureScene } from '../../components/scene'
import { HomeIcon, QuestionIcon, TrophyIcon, UserIcon } from '../../components/ui/icons'
import { cx } from '../../components/ui/cx'
import styles from './MobileShell.module.css'
import { isTabActive, TABS, type ShellProps } from './shell.types'

const TAB_ICONS = [HomeIcon, TrophyIcon, UserIcon, QuestionIcon] as const

export function MobileShell({
  scene,
  children,
  bare = false,
  panelTop,
  fit = false,
  hud,
  hudAt = 'top',
  topHud,
}: ShellProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const play = panelTop !== undefined
  const vars = play ? ({ '--panel-top': `${panelTop}px` } as CSSProperties) : undefined
  return (
    <div className={cx('ps-frame', styles.frame)}>
      <div
        className={cx(
          styles.root,
          play && styles.play,
          play && fit && styles.fit,
          bare && styles.bare,
        )}
        style={vars}
      >
        <div className={styles.scene} data-testid="scene">
          <div className={styles.art}>
            <PastureScene {...scene} label={t('nav.play')} />
          </div>
          {topHud ? <div className={styles.hudTop}>{topHud}</div> : null}
          {hud ? <div className={hudAt === 'bottom' ? styles.hudBottom : styles.hudTop}>{hud}</div> : null}
        </div>
        <main id="main" className={cx('panel', styles.panelBody)}>
          {children}
        </main>
        {bare ? null : (
          <nav className={cx('tabbar', styles.tabbar)} aria-label={t('nav.main')}>
            {TABS.map((tab, i) => {
              const Icon = TAB_ICONS[i] ?? HomeIcon
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    cx('tab', isTabActive(tab, pathname, isActive) && 'on')
                  }
                >
                  <Icon />
                  {t(tab.key)}
                </NavLink>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}
