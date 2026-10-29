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
import { RankAvatar } from '../../components/ui/RankAvatar'
import { Soft } from '../../components/ui/Soft'
import { useSession } from '../../features/auth/session'
import { useScenePasture } from '../../features/pasture/usePasture'
import { useSoundToggle } from '../../features/stats/useSoundToggle'
import { useDesktopMode } from '../../hooks/useDesktopMode'
import './dk.css'
import { isTabActive, TABS, type SceneProps, type ShellProps } from './shell.types'

const TAB_ICONS: Readonly<Record<(typeof TABS)[number]['to'], typeof HomeIcon>> = {
  '/': HomeIcon,
  '/board': TrophyIcon,
  '/profile': UserIcon,
  '/rules': QuestionIcon,
}

/** On desktop the profile is the player chip in the header (avatar and name), not a nav tab. */
const DESKTOP_TABS = TABS.filter((tab) => tab.to !== '/profile')

/** The new game screens: „Нова игра“ in the header would only point at the screen itself. */
const SETUP_PATHS: readonly string[] = ['/new', '/duel/new', '/bot/new']

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
      {DESKTOP_TABS.map((tab) => {
        const Icon = TAB_ICONS[tab.to]
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

function FlameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#F2C230" stroke="#B5452F" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5z" />
    </svg>
  )
}

/** Desk.dc.html header: „Серия N“ (wins in a row) and the player with their title, which opens the profile. */
function PlayerChips() {
  const { t } = useTranslation()
  const me = useSession((s) => s.me)
  // A stored session from an older version may lack parts of the profile: no chips rather than a crash.
  if (!me?.profile || !me.stats) return null
  return (
    <>
      <span className="dk-chip" data-testid="header-streak">
        <FlameIcon />
        {t('header.streak', { count: me.stats.streak })}
      </span>
      <NavLink
        to="/profile"
        className={({ isActive }) => cx('dk-chip dk-me', isActive && 'on')}
        aria-label={`${t('nav.profile')}: ${me.profile.username}`}
        data-testid="header-player"
      >
        <RankAvatar species={me.profile.avatarSpecies} rankKey={me.rankKey} size={34} gold={me.goldFrame === true} />
        <span className="dk-me-name">{me.profile.username}</span>
      </NavLink>
    </>
  )
}

/**
 * Logo pill (with the PasDuel „· {title}“), the nav, „Нова игра“, the player's chips and the sound toggle. The
 * language switch sits here only on the bare screens (login); signed in it lives in the profile settings.
 */
function Header({ bare, title }: { bare: boolean; title?: string }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { muted, toggle: toggleSound } = useSoundToggle()
  // „Игра“ in the nav resumes a running game, so „Нова игра“ is how the mode cards stay reachable from any screen.
  const showNewGame = !bare && !SETUP_PATHS.includes(pathname)
  return (
    <header className="dk-header">
      <div className="dk-brand">
        <img src="/logo-horizontal.svg" alt={t('login.title')} width={131} height={44} />
        {title ? <span className="dk-title">· {title}</span> : null}
      </div>
      {bare ? null : <Nav />}
      <div className="dk-tools">
        {showNewGame ? <Soft small onClick={() => void navigate('/new')}>{t('common.newGame')}</Soft> : null}
        {bare ? <LangSwitch /> : <PlayerChips />}
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
