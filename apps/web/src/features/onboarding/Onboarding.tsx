import { useTranslation } from 'react-i18next'
import { BullIcon, CowIcon, Cta, Soft } from '../../components/ui'
import { Sheet } from '../../components/ui/Sheet'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { sfx } from '../../lib/sound'
import { STEPS } from './steps'
import { useOnboarding } from './store'

const KICKER = { fontSize: 12, fontWeight: 900, letterSpacing: '.14em', color: 'var(--c-muted-aa)', textTransform: 'uppercase' } as const
const TITLE = { margin: 0, fontSize: 26, fontWeight: 900, lineHeight: 1.15 } as const
const TEXT = { margin: 0, color: '#4A5640', fontWeight: 700, lineHeight: 1.45 } as const
const ROW = { display: 'flex', gap: 10, width: '100%' } as const
const SKIP = {
  alignSelf: 'flex-end',
  padding: '4px 6px',
  fontWeight: 800,
  fontSize: 14,
  color: 'var(--c-muted-aa)',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
} as const

function Dots({ step }: { step: number }) {
  const { t } = useTranslation()
  return (
    <div role="img" aria-label={t('onboarding.progressAria', { n: step, total: STEPS.length })} style={{ display: 'flex', gap: 6 }}>
      {STEPS.map((s, i) => (
        <span
          key={s.key}
          style={{ width: i + 1 === step ? 20 : 8, height: 8, borderRadius: 4, background: i + 1 <= step ? '#2E3B24' : '#DCD4BF' }}
        />
      ))}
    </div>
  )
}

function Welcome({ onStart, onSkip }: { onStart(): void; onSkip(): void }) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <>
      <span style={KICKER}>{t('onboarding.welcome.kicker')}</span>
      <div className={reduced ? undefined : 'boing'} style={{ display: 'flex', gap: 8 }} aria-hidden="true">
        <BullIcon size={72} />
        <CowIcon size={72} />
      </div>
      <h2 style={TITLE}>{t('onboarding.welcome.title')}</h2>
      <p style={TEXT}>{t('onboarding.welcome.text')}</p>
      <Cta style={{ width: '100%', minHeight: 54 }} onClick={onStart}>
        {t('onboarding.welcome.start')}
      </Cta>
      <Soft style={{ width: '100%' }} onClick={onSkip}>
        {t('onboarding.welcome.skip')}
      </Soft>
    </>
  )
}

/**
 * The first-visit tour: a welcome card with „Покажи ми“ / „Пропусни“, then one card per step with back, next
 * and skip. Closing it any way marks it seen on this device; „Правила“ can replay it.
 */
export function Onboarding() {
  const { t } = useTranslation()
  const step = useOnboarding((s) => s.step)
  const { go, close } = useOnboarding.getState()
  const current = step > 0 ? STEPS[step - 1] : undefined

  function to(next: number) {
    sfx.play('tap')
    go(next)
  }

  return (
    <Sheet label={t('onboarding.aria')} onClose={close} width={520} centered variant="card" testId="onboarding">
      {current ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Dots step={step} />
            <button type="button" style={SKIP} onClick={close}>
              {t('onboarding.skip')}
            </button>
          </div>
          <h2 style={TITLE}>{t(`onboarding.${current.key}.title`)}</h2>
          <current.Body />
          <div style={ROW}>
            <Soft style={{ flex: 1 }} onClick={() => to(step - 1)} disabled={step === 1}>
              {t('onboarding.back')}
            </Soft>
            {step < STEPS.length ? (
              <Cta style={{ flex: 2, minHeight: 54 }} onClick={() => to(step + 1)}>
                {t('onboarding.next')}
              </Cta>
            ) : (
              <Cta style={{ flex: 2, minHeight: 54 }} onClick={close}>
                {t('onboarding.done')}
              </Cta>
            )}
          </div>
        </>
      ) : (
        <Welcome onStart={() => to(1)} onSkip={close} />
      )}
    </Sheet>
  )
}

/** Lives next to the router: shows the tour while the store says so. */
export function OnboardingHost() {
  const open = useOnboarding((s) => s.open)
  return open ? <Onboarding /> : null
}
