import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { PastureScene } from '../../components/scene'
import { HomeIcon, QuestionIcon, TrophyIcon, UserIcon } from '../../components/ui/icons'
import { cx } from '../../components/ui/cx'
import styles from './MobileShell.module.css'
import { TABS, type ShellProps } from './shell.types'

const TAB_ICONS = [HomeIcon, TrophyIcon, UserIcon, QuestionIcon] as const

export function MobileShell({ scene, children }: ShellProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.root}>
      <div className={styles.scene}>
        <PastureScene {...scene} label={t('nav.play')} />
      </div>
      <main className={cx('panel', styles.panelBody)}>{children}</main>
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
