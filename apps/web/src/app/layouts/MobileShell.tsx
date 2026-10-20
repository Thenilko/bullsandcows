import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { PastureScene } from '../../components/scene'
import { HomeIcon, QuestionIcon, TrophyIcon, UserIcon } from '../../components/ui/icons'
import { cx } from '../../components/ui/cx'
import styles from './MobileShell.module.css'
import { TABS, type ShellProps } from './shell.types'

const TAB_ICONS = [HomeIcon, TrophyIcon, UserIcon, QuestionIcon] as const

export function MobileShell({ scene, children, panelTop, panelPadding, hud }: ShellProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.root}>
      <div className={styles.scene}>
        <PastureScene {...scene} label={t('nav.play')} />
        {hud ? <div style={{ position: 'absolute', left: 12, right: 12, top: 12 }}>{hud}</div> : null}
      </div>
      <main className={cx('panel', styles.panelBody)} style={{ ...(panelTop === undefined ? {} : { top: panelTop }), ...(panelPadding === undefined ? {} : { padding: panelPadding }) }}>{children}</main>
      <nav className="tabbar" aria-label={t('nav.main')}>
        {TABS.map((tab, i) => {
          const Icon = TAB_ICONS[i] ?? HomeIcon
          return (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => cx('tab', isActive && 'on')}>
              <Icon />
              {t(tab.key)}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
