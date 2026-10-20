import { useTranslation } from 'react-i18next'
import { Shell } from '../../app/layouts/Shell'
import { Card, Cta } from '../../components/ui'
import { BotFields, CommonFields, ModeSwitch, OpponentFields, SETUP_NOTE } from './parts/SetupFields'
import { IDLE_SCENE } from './scenes'
import { useSetupForm, type SetupMode } from './useSetupForm'

export type { SetupMode } from './useSetupForm'

const COL = { display: 'flex', flexDirection: 'column', gap: 14 } as const

export function DuelSetup({ mode }: { mode: SetupMode }) {
  const { t } = useTranslation()
  const form = useSetupForm(mode)
  const quick = mode === 'duel' && form.opponent === 'quick'
  const cta = mode === 'bot' ? 'newGame.cta.bot' : quick ? 'newGame.cta.quick' : 'newGame.cta.invite'
  return (
    <Shell scene={IDLE_SCENE} sceneSide>
      <section aria-label={t('duel.title.setup')} style={COL}>
        <h1 className="rise" style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>
          {t('newGame.title')}
        </h1>
        <ModeSwitch mode={mode} onPick={form.switchMode} />
        <Card style={{ ...COL, padding: 16 }}>
          <CommonFields form={form} />
          {mode === 'duel' ? <OpponentFields form={form} /> : <BotFields form={form} />}
        </Card>
        {form.error ? (
          <p role="alert" style={{ margin: 0, fontWeight: 800, color: '#8A1F0B' }}>
            {form.error}
          </p>
        ) : null}
        <Cta disabled={form.busy} style={{ minHeight: 58, fontSize: 19 }} onClick={() => void form.submit()}>
          {t(cta)}
        </Cta>
        {quick ? <p style={SETUP_NOTE}>{t('newGame.quickNote')}</p> : null}
      </section>
    </Shell>
  )
}
