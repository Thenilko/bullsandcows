import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BullIcon, CowIcon, HomeIcon, QuestionIcon, Sign, TrophyIcon, UserIcon } from '../../components/ui'
import { ScarecrowIcon } from '../../components/ui/characters'
import { RewardIcon } from '../pasture/RewardIcon'

const TEXT = { margin: 0, color: '#4A5640', fontWeight: 700, lineHeight: 1.45 } as const
const LIST = { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' } as const
const ITEM = { display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, lineHeight: 1.4 } as const
const ICON_BOX = {
  width: 44,
  height: 44,
  borderRadius: 14,
  background: '#F3EEDF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
} as const
const ART = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, minHeight: 96 } as const
const MARK = { width: 40, height: 46, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 900 } as const

/** One line of a list: an icon in a soft box, the name in bold and what it is. */
function Item({ icon, name, desc }: { icon: ReactNode; name: string; desc: string }) {
  return (
    <li style={ITEM}>
      <span style={ICON_BOX} aria-hidden="true">
        {icon}
      </span>
      <span>
        <b>{name}</b> {'—'} {desc}
      </span>
    </li>
  )
}

function Goal() {
  const { t } = useTranslation()
  return (
    <>
      <div style={ART} aria-hidden="true">
        {['?', '?', '?', '?'].map((c, i) => (
          <Sign key={i}>{c}</Sign>
        ))}
      </div>
      <p style={TEXT}>{t('onboarding.goal.text')}</p>
    </>
  )
}

function Scoring() {
  const { t } = useTranslation()
  return (
    <>
      <ul style={LIST}>
        <Item icon={<BullIcon size={38} />} name={t('rules.step2.bull')} desc={t('onboarding.scoring.bull')} />
        <Item icon={<CowIcon size={38} />} name={t('rules.step2.cow')} desc={t('onboarding.scoring.cow')} />
      </ul>
      <p style={{ ...TEXT, background: '#F3EEDF', borderRadius: 14, padding: '10px 12px' }}>{t('onboarding.scoring.example')}</p>
    </>
  )
}

const DIGIT_MARKS = [
  { digit: '1', state: 'no', bg: '#F6D9D2', color: '#B5452F' },
  { digit: '2', state: 'yes', bg: '#DCEFD0', color: '#3E7A2C' },
  { digit: '3', state: 'unknown', bg: '#F3EEDF', color: '#4A5640' },
] as const

function PastureAndNotebook() {
  const { t } = useTranslation()
  return (
    <>
      <div style={ART} aria-hidden="true">
        <BullIcon size={56} />
        {DIGIT_MARKS.map((m) => (
          <span key={m.digit} style={{ ...MARK, background: m.bg, color: m.color }}>
            <span style={{ fontSize: 18 }}>{m.digit}</span>
            <span style={{ fontSize: 10 }}>{t(`notebook.state.${m.state}`)}</span>
          </span>
        ))}
      </div>
      <p style={TEXT}>{t('onboarding.pasture.text')}</p>
    </>
  )
}

function Modes() {
  const { t } = useTranslation()
  return (
    <ul style={LIST}>
      <Item icon={<Sign style={{ width: 30, height: 34, fontSize: 15 }}>1</Sign>} name={t('onboarding.modes.daily')} desc={t('onboarding.modes.dailyDesc')} />
      <Item icon={<CowIcon size={34} />} name={t('onboarding.modes.free')} desc={t('onboarding.modes.freeDesc')} />
      <Item icon={<BullIcon size={34} />} name={t('onboarding.modes.duel')} desc={t('onboarding.modes.duelDesc')} />
      <Item icon={<ScarecrowIcon size={36} />} name={t('onboarding.modes.bot')} desc={t('onboarding.modes.botDesc')} />
    </ul>
  )
}

function Progress() {
  const { t } = useTranslation()
  return (
    <>
      <div style={ART} aria-hidden="true">
        <RewardIcon item="dog" size={74} />
        <RewardIcon item="windmill" size={84} />
        <RewardIcon item="pond" size={74} />
      </div>
      <p style={TEXT}>{t('onboarding.progress.text')}</p>
    </>
  )
}

function Navigation() {
  const { t } = useTranslation()
  return (
    <>
      <ul style={LIST}>
        <Item icon={<HomeIcon />} name={t('nav.play')} desc={t('onboarding.nav.play')} />
        <Item icon={<TrophyIcon />} name={t('nav.board')} desc={t('onboarding.nav.board')} />
        <Item icon={<UserIcon />} name={t('nav.profile')} desc={t('onboarding.nav.profile')} />
        <Item icon={<QuestionIcon />} name={t('nav.rules')} desc={t('onboarding.nav.rules')} />
      </ul>
      <p style={{ ...TEXT, fontSize: 14 }}>{t('onboarding.nav.where')}</p>
    </>
  )
}

/** The tour after the welcome card, in order: the i18n key of the title and the body. */
export const STEPS = [
  { key: 'goal', Body: Goal },
  { key: 'scoring', Body: Scoring },
  { key: 'pasture', Body: PastureAndNotebook },
  { key: 'modes', Body: Modes },
  { key: 'progress', Body: Progress },
  { key: 'nav', Body: Navigation },
] as const
