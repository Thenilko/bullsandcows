import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Bar,
  Card,
  Chip,
  Confetti,
  Countdown,
  Cta,
  Field,
  Hud,
  Inset,
  Keypad,
  Pill,
  Podium,
  Seg,
  Sign,
  Slots,
  Soft,
  Toast,
  Toggle,
  type DigitMark,
} from '../components/ui'

const BADGES = [
  { variant: 1, bg: '#F6E3B4', key: 'firstBull' },
  { variant: 2, bg: '#DCEFD0', key: 'noWaste' },
  { variant: 3, bg: '#D7E9F7', key: 'underMinute' },
  { variant: 4, bg: '#F9D7C8', key: 'streak7' },
  { variant: 5, bg: '#F6E3B4', key: 'chiefBull' },
  { variant: 6, bg: '#E7DDF6', key: 'fiveDigits' },
] as const

type Period = 'today' | 'week' | 'all'

const MARKS: Readonly<Record<string, DigitMark>> = { '1': 1, '7': 2 }
const PODIUM = [
  { rank: 1, name: 'Mila', score: 980, rankKey: 'chiefBull', species: 'cow' },
  { rank: 2, name: 'Ivo', score: 870, rankKey: 'steward', species: 'bull' },
  { rank: 3, name: 'Desi', score: 760, rankKey: 'pastor', species: 'cow' },
] as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
      {children}
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
}

function Controls() {
  const { t } = useTranslation()
  const [on, setOn] = useState(true)
  const [period, setPeriod] = useState<Period>('today')
  const [pill, setPill] = useState(false)
  return (
    <>
      <Section title="Cta / Soft / Pill">
        <Row>
          <Cta>{t('common.start')}</Cta>
          <Cta disabled>{t('common.start')} (disabled)</Cta>
          <Cta small>{t('common.ok')}</Cta>
          <Soft>{t('common.back')}</Soft>
          <Soft small>{t('common.cancel')}</Soft>
          <Pill on={pill} onClick={() => setPill(!pill)}>
            {t('common.digits', { count: 4 })}
          </Pill>
          <Pill on>{t('common.digits', { count: 5 })}</Pill>
        </Row>
      </Section>
      <Section title="Toggle / Seg">
        <Row>
          <Toggle on={on} onChange={setOn} label={t('settings.sound')} />
          <Toggle on={false} onChange={() => {}} label={t('settings.vibration')} />
        </Row>
        <Seg<Period>
          value={period}
          onChange={setPeriod}
          label={t('board.period')}
          options={[
            { value: 'today', label: t('board.tab.today') },
            { value: 'week', label: t('board.tab.week') },
            { value: 'all', label: t('board.tab.all') },
          ]}
        />
      </Section>
      <Section title="Field">
        <Field label={t('login.title')} placeholder={t('login.title')} />
        <Field label={t('login.title')} placeholder={t('login.title')} error={t('error.ERR_INPUT')} />
      </Section>
    </>
  )
}

function Display() {
  const { t } = useTranslation()
  const [toastTick, setToastTick] = useState(1)
  return (
    <>
      <Section title="Sign">
        <Row>
          <Sign>7</Sign>
          <Sign cur />
          <Sign big>4</Sign>
        </Row>
      </Section>
      <Section title="Card / Inset / Chip / Hud">
        <Card style={{ padding: 16 }}>Card</Card>
        <Inset style={{ padding: 12 }}>Inset</Inset>
        <Row>
          <Chip>
            <span>1234</span>
            <span style={{ color: '#8E3424' }}>2</span>
            <span style={{ color: '#4A5640' }}>1</span>
          </Chip>
          <Chip fresh>5678</Chip>
        </Row>
        <Hud
          items={[
            { label: t('common.attempts', { count: 3 }), value: '' },
            { label: t('common.variantsShort', { count: 120 }), value: '' },
            { label: '02:14', value: '' },
          ]}
        />
      </Section>
      <Section title="Badge">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {BADGES.map((b, i) => (
            <Badge key={b.key} variant={b.variant} bg={b.bg} name={t(`badge.${b.key}.name`)} locked={i % 2 === 1} />
          ))}
        </div>
      </Section>
      <Section title="Bar">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
          {[20, 45, 100, 60, 30].map((h, i) => (
            <Bar key={h} h={`${h}%`} c="#86C462" d={`${i * 0.05}s`} />
          ))}
        </div>
      </Section>
      <Section title="Podium">
        <Podium rows={PODIUM} />
      </Section>
      <Section title="Toast">
        <div style={{ position: 'relative', height: 60 }}>
          <Toast tick={toastTick}>{t('common.copied')}</Toast>
        </div>
        <Soft small onClick={() => setToastTick(toastTick + 1)}>
          replay
        </Soft>
      </Section>
    </>
  )
}

function Game() {
  const [current, setCurrent] = useState('')
  const [shake, setShake] = useState(0)
  const [running, setRunning] = useState(false)
  return (
    <>
      <Section title="Slots / Keypad">
        <Slots len={4} current={current} active shake={shake} />
        <Keypad
          len={4}
          zero
          current={current}
          marks={MARKS}
          disabled={false}
          onPress={(d) => setCurrent(current + d)}
          onBack={() => setCurrent(current.slice(0, -1))}
          onSubmit={() => setShake(shake + 1)}
        />
      </Section>
      <Section title="Keypad (disabled)">
        <Keypad len={4} zero={false} current="" marks={{}} disabled onPress={() => {}} onBack={() => {}} onSubmit={() => {}} />
      </Section>
      <Section title="Countdown / Confetti">
        <Soft small onClick={() => setRunning(true)}>
          run countdown
        </Soft>
        <div style={{ position: 'relative', height: 220, background: '#A9D6F0', overflow: 'hidden' }}>
          <Countdown running={running} onDone={() => setRunning(false)} />
          <Confetti active />
        </div>
      </Section>
    </>
  )
}

export function PrimitivesScreen() {
  return (
    <div style={{ padding: 16, maxWidth: 520 }}>
      <Controls />
      <Display />
      <Game />
    </div>
  )
}
