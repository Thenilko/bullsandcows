import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Shell } from '../app/layouts/Shell'
import { useSession } from '../features/auth/session'
import { BullIcon, Card, CowIcon, Cta, Sign } from '../components/ui'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { sfx } from '../lib/sound'
import { IDLE_SCENE } from './idleScene'

const EXAMPLE_LEN = 4
const STEP_BADGE = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: '#2E3B24',
  color: '#FFFFFF',
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const
const BODY = { margin: 0, color: '#4A5640', fontWeight: 600, lineHeight: 1.5 } as const
const CARD = { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } as const

function StepTitle({ n, children }: { n: number; children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={STEP_BADGE} aria-hidden="true">
        {n}
      </span>
      <b style={{ fontSize: 17 }}>{children}</b>
    </div>
  )
}

function Animal({ icon, name, desc }: { icon: ReactNode; name: string; desc: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {icon}
      <span style={{ fontWeight: 700, lineHeight: 1.45 }}>
        <b>{name}</b> {'\u2014'} {desc}
      </span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span style={{ color: '#4A5640' }}>{label}</span>
      <span style={{ letterSpacing: '.3em', fontWeight: 900, fontSize: 18 }}>{value}</span>
    </>
  )
}

export function Rules() {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const authed = useSession((s) => s.session !== null)

  function go() {
    sfx.play('tap')
    void navigate(authed ? '/' : '/login')
  }

  return (
    <Shell scene={IDLE_SCENE} sceneSide>
      <section aria-label={t('rules.area')} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 className="rise" style={{ margin: 0, fontSize: desktop ? 40 : 30, fontWeight: 900 }}>
          {t('rules.title')}
        </h1>
        <Card className="rise" style={{ ...CARD, animationDelay: '.05s' }}>
          <StepTitle n={1}>{t('rules.step1.title')}</StepTitle>
          <div style={{ display: 'flex', gap: 8, justifyContent: desktop ? 'flex-start' : 'center' }}>
            {Array.from({ length: EXAMPLE_LEN }, (_, i) => (
              <Sign key={i}>?</Sign>
            ))}
          </div>
          <p style={BODY}>{t('rules.step1.text', { count: EXAMPLE_LEN })}</p>
        </Card>
        <Card className="rise" style={{ ...CARD, animationDelay: '.1s' }}>
          <StepTitle n={2}>{t('rules.step2.title')}</StepTitle>
          <Animal icon={<BullIcon size={desktop ? 54 : 46} />} name={t('rules.step2.bull')} desc={t('rules.step2.bullDesc')} />
          <Animal icon={<CowIcon size={desktop ? 54 : 46} />} name={t('rules.step2.cow')} desc={t('rules.step2.cowDesc')} />
        </Card>
        <Card className="rise" style={{ ...CARD, gap: 10, animationDelay: '.15s' }}>
          <StepTitle n={3}>{t('rules.example.title')}</StepTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', alignItems: 'center', fontWeight: 700 }}>
            <Row label={t('rules.example.secret')} value="4 2 7 1" />
            <Row label={t('rules.example.attempt')} value="1 2 3 4" />
            <span style={{ color: '#4A5640' }}>{t('rules.example.answer')}</span>
            <span>{t(desktop ? 'rules.example.answerLong' : 'rules.example.answerShort')}</span>
          </div>
        </Card>
        <Card className="rise" style={{ ...CARD, animationDelay: '.2s' }}>
          <b style={{ fontSize: 17 }}>{t('rules.fog.title')}</b>
          <p style={BODY}>
            <Trans i18nKey={desktop ? 'rules.fog.textLong' : 'rules.fog.text'} components={{ b: <b style={{ color: '#2E3B24' }} /> }} />
          </p>
        </Card>
        <Cta onClick={go} style={{ minHeight: 56, alignSelf: desktop ? 'flex-start' : 'stretch', minWidth: desktop ? 240 : undefined }}>
          {t('rules.start')}
        </Cta>
      </section>
    </Shell>
  )
}
