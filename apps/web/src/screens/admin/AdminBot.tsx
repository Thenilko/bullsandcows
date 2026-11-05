import { BOT_CONFIG_LIMITS, BotConfigDto } from '@bc/protocol'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminBotConfig, useSaveBotConfig } from '../../features/admin/useAdminBot'
import styles from './admin.module.css'
import bot from './adminBot.module.css'

const LEVELS = [
  { level: 1, key: 'easy' },
  { level: 2, key: 'normal' },
  { level: 3, key: 'hard' },
  { level: 4, key: 'expert' },
] as const

/** The form keeps what is typed; numbers are parsed only on save. */
interface Draft {
  readonly thinkSec: readonly string[]
  readonly lostPct: readonly string[]
  readonly sample: string
}

const secs = (ms: number): string => String(Math.round(ms / 100) / 10)
const pct = (chance: number): string => String(Math.round(chance * 100))

const toDraft = (c: BotConfigDto): Draft => ({
  thinkSec: c.raceThinkMs.map(secs),
  lostPct: c.lostHint.map(pct),
  sample: String(c.proSample),
})

/** Empty or non-numeric text becomes NaN, which the schema refuses. */
const num = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text))

function fromDraft(d: Draft): BotConfigDto | null {
  const parsed = BotConfigDto.safeParse({
    raceThinkMs: d.thinkSec.map((s) => Math.round(num(s) * 1000)),
    lostHint: d.lostPct.map((p) => num(p) / 100),
    proSample: num(d.sample),
  })
  return parsed.success ? parsed.data : null
}

const replaceAt = (list: readonly string[], i: number, value: string): string[] =>
  list.map((v, j) => (j === i ? value : v))

type Notice = 'saved' | 'resetDone' | 'saveError' | null

function BotForm({ config, defaults }: { config: BotConfigDto; defaults: BotConfigDto }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Draft>(() => toDraft(config))
  const [notice, setNotice] = useState<Notice>(null)
  const save = useSaveBotConfig()
  const sampleId = useId()
  const next = fromDraft(draft)
  const edit = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setNotice(null)
  }
  const send = (value: BotConfigDto | null, done: Notice) =>
    save.mutate(value, {
      onSuccess: (data) => {
        setDraft(toDraft(data.config))
        setNotice(done)
      },
      onError: () => setNotice('saveError'),
    })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (next) send(next, 'saved')
  }
  const { thinkMs, proSample } = BOT_CONFIG_LIMITS

  return (
    <form className={bot.form} onSubmit={submit} noValidate>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t('admin.botCfg.level')}</th>
              <th scope="col">{t('admin.botCfg.think')}</th>
              <th scope="col">{t('admin.botCfg.lostHint')}</th>
            </tr>
          </thead>
          <tbody>
            {LEVELS.map(({ level, key }, i) => {
              const name = t(`bot.level.${key}.name`)
              const lost = i < 3 ? i : null
              return (
                <tr key={level}>
                  <th scope="row">{name}</th>
                  <td>
                    <input
                      className={bot.input}
                      type="number"
                      inputMode="decimal"
                      min={thinkMs.min / 1000}
                      max={thinkMs.max / 1000}
                      step="0.5"
                      aria-label={`${name}: ${t('admin.botCfg.think')}`}
                      value={draft.thinkSec[i]}
                      onChange={(e) =>
                        edit({ thinkSec: replaceAt(draft.thinkSec, i, e.target.value) })
                      }
                    />
                    <span className={bot.hint}>
                      {t('admin.botCfg.defaultValue', {
                        value: secs(defaults.raceThinkMs[i] ?? 0),
                      })}
                    </span>
                  </td>
                  <td>
                    {lost === null ? (
                      <span className={bot.hint}>{t('admin.botCfg.neverLoses')}</span>
                    ) : (
                      <>
                        <input
                          className={bot.input}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={100}
                          step="1"
                          aria-label={`${name}: ${t('admin.botCfg.lostHint')}`}
                          value={draft.lostPct[lost]}
                          onChange={(e) =>
                            edit({ lostPct: replaceAt(draft.lostPct, lost, e.target.value) })
                          }
                        />
                        <span className={bot.hint}>
                          {t('admin.botCfg.defaultValue', {
                            value: pct(defaults.lostHint[lost] ?? 0),
                          })}
                        </span>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className={bot.field}>
        <label htmlFor={sampleId}>{t('admin.botCfg.sample')}</label>
        <input
          id={sampleId}
          className={bot.input}
          type="number"
          inputMode="numeric"
          min={proSample.min}
          max={proSample.max}
          step="1"
          value={draft.sample}
          onChange={(e) => edit({ sample: e.target.value })}
        />
        <span className={bot.hint}>
          {t('admin.botCfg.sampleHint', { min: proSample.min, max: proSample.max })} ·{' '}
          {t('admin.botCfg.defaultValue', { value: defaults.proSample })}
        </span>
      </div>

      <p className={bot.hint}>
        {t('admin.botCfg.bounds', { min: thinkMs.min / 1000, max: thinkMs.max / 1000 })}
      </p>
      {next === null ? (
        <p role="alert" className={bot.error}>
          {t('admin.botCfg.invalid')}
        </p>
      ) : null}
      {notice ? (
        <p
          role={notice === 'saveError' ? 'alert' : 'status'}
          className={notice === 'saveError' ? bot.error : bot.ok}
        >
          {t(`admin.botCfg.${notice}`)}
        </p>
      ) : null}

      <div className={bot.actions}>
        <button type="submit" className={styles.button} disabled={next === null || save.isPending}>
          {save.isPending ? t('admin.botCfg.saving') : t('admin.botCfg.save')}
        </button>
        <button
          type="button"
          className={styles.back}
          disabled={save.isPending}
          onClick={() => send(null, 'resetDone')}
        >
          {t('admin.botCfg.reset')}
        </button>
      </div>
    </form>
  )
}

/** „Бот“: the duel bot's tuning for new bot rooms (a running game keeps the values it started with). */
export function AdminBot({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation()
  const query = useAdminBotConfig(enabled)
  const data = query.data
  if (query.isError && !data) return <p className={styles.empty}>{t('admin.error')}</p>
  if (!data) return <p className={styles.empty}>{t('admin.loading')}</p>
  return (
    <div className={styles.stack}>
      <p className={styles.empty}>
        {t('admin.botCfg.intro')}{' '}
        {t(data.isDefault ? 'admin.botCfg.isDefault' : 'admin.botCfg.isCustom')}
      </p>
      <BotForm config={data.config} defaults={data.defaults} />
    </div>
  )
}
