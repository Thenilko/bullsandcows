import { wideSunY } from '@bc/game-core'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { WIDE_VIEWBOX, WideScene, wideSceneAnimals, type SceneMode, type Tally } from '../../components/scene'
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
import { useScenePasture } from '../../features/pasture/usePasture'
import { useSoundToggle } from '../../features/stats/useSoundToggle'
import { useDesktopMode } from '../../hooks/useDesktopMode'
import './dk.css'
import { isTabActive, TABS, type SceneProps, type ShellProps } from './shell.types'

const TAB_ICONS = [HomeIcon, TrophyIcon, UserIcon, QuestionIcon] as const

/** The sign in front of the pen: bulls and cows of the last verdict (Desk.dc.html `tally`). */
export function tallyOf(mode: SceneMode): Tally {
  switch (mode.kind) {
    case 'play':
      return { b: mode.bulls, c: mode.cows }
    case 'result':
      return { b: mode.bulls, c: 0 }
    case 'idle':
      return { b: 0, c: 0 }
  }
}

/** The wide 1600×900 pasture built from the shared scene description (the phone scene keeps its own numbers). */
function Scene({ scene, viewBox, label }: { scene: SceneProps; viewBox: string; label: string }) {
  const { mode, prog, fog, dawn, parity, miss } = scene
  const animals = useMemo(() => wideSceneAnimals(mode), [mode])
  const pasture = useScenePasture(scene.pasture)
  return (
    <WideScene
      fog={fog}
      dawn={dawn}
      parity={parity}
      miss={miss}
      sunY={wideSunY(prog)}
      animals={animals}
      tally={tallyOf(mode)}
      viewBox={viewBox}
      label={label}
      pasture={pasture}
    />
  )
}

function Nav() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  return (
    <nav className="dk-nav" aria-label={t('nav.main')}>
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
  )
}

/** Logo pill (with the PasDuel „· {title}“), the nav, „Нова игра“, the language and sound toggles. */
function Header({ bare, title }: { bare: boolean; title?: string }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { muted, toggle: toggleSound } = useSoundToggle()
  // „Игра“ in the nav resumes a running game, so „Нова игра“ is how the mode cards stay reachable from any screen.
  const showNewGame = !bare && pathname !== '/new'
  return (
    <header className="dk-header">
      <div className="dk-brand">
        <img src="/logo-horizontal.svg" alt={t('login.title')} width={131} height={44} />
        {title ? <span className="dk-title">· {title}</span> : null}
      </div>
      {bare ? null : <Nav />}
      <div className="dk-tools">
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
  )
}

/**
 * Desktop shell (Desk.dc.html, PasDuel.dc.html layout="desktop"): the root carries `dk-imm` (immersive, from
 * 820px of height: full-bleed scene) or `dk-split` (scene card on the left, column on the right) and
 * `sc-<screen>`; dk.css places the header, hud, column and opponent strip per mode and screen.
 */
export function DesktopShell({ scene, screen, children, title, bare = false, hud, hudAt = 'top' }: ShellProps) {
  const { t } = useTranslation()
  const mode = useDesktopMode()
  const immersive = mode === 'immersive'
  // The opponent strip: bottom-left of the full-bleed scene, or inside the scene card.
  const strip = hud && hudAt === 'bottom' ? <div className="dk-strip">{hud}</div> : null
  // Top chips (fog, clock): the immersive layout shows them only over the game.
  const chips = hud && hudAt === 'top' && (!immersive || screen === 'play') ? <div className="dk-hud">{hud}</div> : null

  return (
    <div className={cx('dk', immersive ? 'dk-imm' : 'dk-split', `sc-${screen}`)} data-mode={mode}>
      <a className="skip-link" href="#main">
        {t('nav.skip')}
      </a>
      <div className="dk-scene">
        <Scene scene={scene} viewBox={WIDE_VIEWBOX[mode]} label={t('nav.play')} />
        {immersive ? null : strip}
      </div>
      <Header bare={bare} title={title} />
      {chips}
      {immersive ? strip : null}
      <main id="main" tabIndex={-1} className="dk-col">
        {children}
      </main>
    </div>
  )
}
