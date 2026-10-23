import { totalCodes, type Len } from '@bc/game-core'
import type { DuelFormat } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Pill, Toggle } from '../../../components/ui'
import { BullIcon, CowIcon, ScarecrowIcon } from '../../../components/ui/icons'
import type { BotLevel, Opponent, PickedMode, SetupForm } from '../useSetupForm'
import { OptionGrid } from './OptionGrid'

const LENS: readonly Len[] = [3, 4, 5]
const MODES: readonly PickedMode[] = ['solo', 'duel', 'bot']
const LEVELS = [
  { level: 1, key: 'easy' },
  { level: 2, key: 'normal' },
  { level: 3, key: 'hard' },
  { level: 4, key: 'expert' },
] as const satisfies readonly { level: BotLevel; key: string }[]
export const SETUP_NOTE = { margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--c-muted-aa)', textAlign: 'center', lineHeight: 1.45 } as const

/** The prototype's mode pictures: a bull for solo, a bull next to a cow for a duel, the scarecrow for the bot. */
function ModeIcon({ mode }: { mode: PickedMode }) {
  if (mode === 'solo') return <BullIcon size={40} />
  if (mode === 'bot') return <ScarecrowIcon size={40} />
  return (
    <span style={{ display: 'flex' }} data-icon="duel">
      <BullIcon size={32} />
      <span style={{ display: 'flex', marginLeft: -10, marginTop: 6 }}>
        <CowIcon size={32} />
      </span>
    </span>
  )
}

export function ModeSwitch({ mode, onPick }: { mode: PickedMode; onPick(m: PickedMode): void }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }} role="group" aria-label={t('newGame.modeGroup')}>
      {MODES.map((m) => (
        <button key={m} type="button" className={`mode${m === mode ? ' on' : ''}`} aria-pressed={m === mode} onClick={() => onPick(m)}>
          <ModeIcon mode={m} />
          {t(`newGame.mode.${m}.name`)}
          <small>{t(`newGame.mode.${m}.desc`)}</small>
        </button>
      ))}
    </div>
  )
}

/** Length, zero toggle, code count and match format. */
export function CommonFields({ form }: { form: SetupForm }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="setrow">
        <span className="setlab">{t('newGame.digits')}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {LENS.map((n) => (
            <Pill key={n} on={n === form.len} style={{ minHeight: 40, minWidth: 48 }} onClick={() => form.setLen(n)}>
              {n}
            </Pill>
          ))}
        </div>
      </div>
      <div className="setrow">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="setlab">{t('newGame.zero.label')}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7560' }}>{t(form.zero ? 'newGame.zero.on' : 'newGame.zero.off')}</span>
        </div>
        <Toggle on={form.zero} onChange={form.setZero} label={t('newGame.zero.aria')} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#8E3424' }}>{t('newGame.codes', { count: totalCodes(form.len, form.zero) })}</span>
      <span className="setlab">{t('newGame.format.label')}</span>
      <OptionGrid<DuelFormat>
        label={t('newGame.format.label')}
        value={form.format}
        onChange={form.setFormat}
        options={(['race', 'classic'] as const).map((f) => ({ value: f, label: t(`newGame.format.${f}.name`), desc: t(`newGame.format.${f}.desc`) }))}
      />
    </>
  )
}

export function OpponentFields({ form }: { form: SetupForm }) {
  const { t } = useTranslation()
  return (
    <>
      <span className="setlab">{t('newGame.opponent.label')}</span>
      <OptionGrid<Opponent>
        label={t('newGame.opponent.label')}
        value={form.opponent}
        onChange={form.setOpponent}
        options={(['quick', 'friend'] as const).map((o) => ({
          value: o,
          label: t(`newGame.opponent.${o}.name`),
          desc: t(`newGame.opponent.${o}.desc`),
          disabled: o === 'quick' && form.isGuest,
        }))}
      />
      {form.isGuest ? <span style={SETUP_NOTE}>{t('common.guestOnly')}</span> : null}
    </>
  )
}

export function BotFields({ form }: { form: SetupForm }) {
  const { t } = useTranslation()
  const key = LEVELS.find((l) => l.level === form.level)?.key ?? 'normal'
  return (
    <>
      <span className="setlab">{t('newGame.botLevel')}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
        {LEVELS.map((l) => (
          <Pill key={l.level} on={l.level === form.level} style={{ minHeight: 40, padding: '0 6px', fontSize: 13 }} onClick={() => form.setLevel(l.level)}>
            {t(`bot.level.${l.key}.name`)}
          </Pill>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#4A5640', lineHeight: 1.45 }}>{t(`bot.level.${key}.desc`)}</p>
    </>
  )
}

