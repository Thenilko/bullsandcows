import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { PastureScene } from '../../components/scene'
import { cx } from '../../components/ui/cx'
import {
  BullIcon,
  HomeIcon,
  SoundOffIcon,
  SoundOnIcon,
  TrophyIcon,
  UserIcon,
  QuestionIcon,
} from '../../components/ui/icons'
import { LangSwitch } from '../../components/ui/LangSwitch'
import { useSoundToggle } from '../../features/stats/useSoundToggle'
import styles from './DesktopShell.module.css'
import { HUD_BOTTOM_DESKTOP, isTabActive, TABS, type ShellProps } from './shell.types'

const TAB_ICONS = [HomeIcon, TrophyIcon, UserIcon, QuestionIcon] as const

export function DesktopShell({ scene, children, sceneSide = false, bare = false, hud, hudAt = 'top' }: ShellProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { muted, toggle: toggleSound } = useSoundToggle()

  return (
    <div className={styles.root}>
      <a className="skip-link" href="#main">
        {t('nav.skip')}
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <BullIcon size={40} ring />
          <span>{t('login.title')}</span>
        </div>
        {bare ? null : (
          <nav className={styles.navbar} aria-label={t('nav.main')}>
            {TABS.map((tab, i) => {
              const Icon = TAB_ICONS[i] ?? HomeIcon
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) => cx('nav', isTabActive(tab, pathname, isActive) && 'on')}
                >
                  <Icon size={18} />
                  {t(tab.key)}
                </NavLink>
              )
            })}
          </nav>
        )}
        <div className={styles.tools}>
          <LangSwitch />
          <button
            type="button"
            className="iconbox icobtn"
            aria-label={muted ? t('settings.muteOff') : t('settings.muteOn')}
            onClick={toggleSound}
          >
            {muted ? <SoundOffIcon /> : <SoundOnIcon />}
          </button>
        </div>
      </header>
      <div className={styles.main}>
        <div className={cx(styles.sceneCol, sceneSide && styles.sceneColSide)}>
          <div className={cx('card', styles.sceneCard)}>
            <PastureScene {...scene} label={t('nav.play')} />
            {hud ? (
              <div style={{ position: 'absolute', left: 16, right: 16, ...(hudAt === 'top' ? { top: 16 } : { bottom: HUD_BOTTOM_DESKTOP, zIndex: 2 }) }}>{hud}</div>
            ) : null}
          </div>
        </div>
        <main id="main" tabIndex={-1} className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
