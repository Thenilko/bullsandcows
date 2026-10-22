import { useTranslation } from 'react-i18next'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { PastureScene } from '../../components/scene'
import { cx } from '../../components/ui/cx'
import {
  HomeIcon,
  SoundOffIcon,
  SoundOnIcon,
  TrophyIcon,
  UserIcon,
  QuestionIcon,
} from '../../components/ui/icons'
import { LangSwitch } from '../../components/ui/LangSwitch'
import { Soft } from '../../components/ui/Soft'
import { useSoundToggle } from '../../features/stats/useSoundToggle'
import styles from './DesktopShell.module.css'
import { isTabActive, TABS, type ShellProps } from './shell.types'

const TAB_ICONS = [HomeIcon, TrophyIcon, UserIcon, QuestionIcon] as const

export function DesktopShell({ scene, children, sceneSide = false, panelCard = false, bare = false, hud, hudAt = 'top' }: ShellProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { muted, toggle: toggleSound } = useSoundToggle()
  // PasDuel desktop header: „Нова игра“ next to the sound button. „Игра“ in the nav resumes a running game, so
  // this is how the mode cards (solo / duel / bot) stay reachable from any screen.
  const showNewGame = !bare && pathname !== '/new'

  return (
    <div className={styles.root}>
      <a className="skip-link" href="#main">
        {t('nav.skip')}
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/logo-horizontal.svg" alt={t('login.title')} width={167} height={56} />
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
          {showNewGame ? <Soft small onClick={() => void navigate('/new')}>{t('common.newGame')}</Soft> : null}
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
        <div className={cx(styles.sceneCol, sceneSide && styles.sceneColSide, panelCard && styles.sceneColDuel)}>
          <div className={cx('card', styles.sceneCard)}>
            <PastureScene {...scene} label={t('nav.play')} />
            {hud && hudAt === 'top' ? <div style={{ position: 'absolute', left: 16, right: 16, top: 16 }}>{hud}</div> : null}
          </div>
          {hud && hudAt === 'bottom' ? <div className={styles.hudBelow}>{hud}</div> : null}
        </div>
        <main id="main" tabIndex={-1} className={cx(styles.content, panelCard && 'card', panelCard && styles.panelCard)}>
          {children}
        </main>
      </div>
    </div>
  )
}
