import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
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
import { setLang } from '../../i18n'
import { sfx } from '../../lib/sfx'
import styles from './DesktopShell.module.css'
import { TABS, type ShellProps } from './shell.types'

const TAB_ICONS = [HomeIcon, TrophyIcon, UserIcon, QuestionIcon] as const

export function DesktopShell({ scene, children, sceneSide = false, bare = false, hud }: ShellProps) {
  const { t, i18n } = useTranslation()
  const [muted, setMuted] = useState(() => sfx.isMuted())
  const nextLang = i18n.language === 'bg' ? 'en' : 'bg'

  function toggleSound() {
    sfx.setMuted(!muted)
    setMuted(!muted)
  }

  return (
    <div className={styles.root}>
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
                  className={({ isActive }) => cx('nav', isActive && 'on')}
                >
                  <Icon size={18} />
                  {t(tab.key)}
                </NavLink>
              )
            })}
          </nav>
        )}
        <div className={styles.tools}>
          <button
            type="button"
            className="iconbox icobtn"
            aria-label={t('settings.lang')}
            onClick={() => setLang(nextLang)}
          >
            {nextLang.toUpperCase()}
          </button>
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
            {hud ? <div style={{ position: 'absolute', left: 16, right: 16, top: 16 }}>{hud}</div> : null}
          </div>
        </div>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
