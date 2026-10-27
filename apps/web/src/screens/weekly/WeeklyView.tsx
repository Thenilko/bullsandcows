import type { WeeklyDto, WeeklyRowDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Cta } from '../../components/ui'
import { ctaOf, ruleChips, timeLeft, weekDates } from '../../features/weekly/weeklyModel'
import { KICKER, LeaderRow, MUTED, StarMedal } from './parts'

export interface WeeklyViewProps {
  week: WeeklyDto
  now: number
  /** The player's name and avatar for their own row below the top 3. */
  username: string
  self: WeeklySelf
  onPlay(): void
  busy: boolean
  error?: string | null
}

const STAT_VALUE = { fontSize: 22, fontWeight: 900 } as const
const CARD = { padding: '14px 16px' } as const

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div style={STAT_VALUE}>{value}</div>
      <div style={MUTED}>{label}</div>
    </div>
  )
}

/** How the player's own avatar is drawn (from the session). */
export type WeeklySelf = Pick<WeeklyRowDto, 'level' | 'rankKey' | 'avatarSpecies' | 'goldFrame'>

/** The player's row when they are not among the leaders shown. */
function ownRow(week: WeeklyDto, self: WeeklySelf): WeeklyRowDto | null {
  if (week.place === null || week.best === null || week.top.some((r) => r.you)) return null
  return {
    ...self,
    rank: week.place,
    username: '',
    attempts: week.best.attempts,
    secs: week.best.secs,
    you: true,
  }
}

/** Р7 / ПД9: the plank, the rule chips, the time left, your result, the leaders, the reward and the CTA. */
export function WeeklyView({ week, now, username, self, onPlay, busy, error }: WeeklyViewProps) {
  const { t, i18n } = useTranslation()
  const cta = ctaOf(week)
  const best = week.best
  const mine = ownRow(week, self)
  const bestText = !best
    ? t('weekly.best.none')
    : best.won
      ? t('common.attemptsShort', { count: best.attempts })
      : t('weekly.best.lost')
  return (
    <>
      <div className="wk-plank">
        <span style={KICKER}>
          {t('weekly.range', {
            week: week.week,
            dates: weekDates(week.monday, week.sunday, i18n.language),
          })}
        </span>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>
          {t(`weekly.rule.${week.rule.key}`)}
        </h1>
      </div>
      <ul
        aria-label={t('weekly.card.aria')}
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'center',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {[...ruleChips(t, week.rule), t('weekly.chip.same')].map((c) => (
          <li key={c} className="tag wk-chip">
            {c}
          </li>
        ))}
      </ul>
      <div
        className="card"
        style={{
          ...CARD,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
          textAlign: 'center',
        }}
      >
        <Stat value={timeLeft(t, week.endsAt, now)} label={t('weekly.left.label')} />
        <Stat value={bestText} label={t('weekly.best.label')} />
        <Stat
          value={
            week.place === null ? (
              t('weekly.best.none')
            ) : (
              <>
                {week.place}
                <span style={{ fontSize: 14, color: 'var(--c-muted-aa)' }}>
                  {t('weekly.place.of', { count: week.participants })}
                </span>
              </>
            )
          }
          label={t('weekly.place.label')}
        />
      </div>
      <section
        className="card"
        aria-labelledby="weekly-leaders"
        style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <h2 id="weekly-leaders" style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
          {t('weekly.leaders')}
        </h2>
        {week.top.length === 0 ? (
          <p style={{ margin: 0, fontWeight: 700, color: '#4A5640' }}>{t('weekly.noLeaders')}</p>
        ) : (
          <ol
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {week.top.map((r) => (
              <LeaderRow key={r.rank} row={r} name={username} />
            ))}
            {mine ? <LeaderRow row={mine} name={username} /> : null}
          </ol>
        )}
      </section>
      <div
        className="inset"
        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <StarMedal />
        <span style={{ fontWeight: 700, color: '#4A5640', lineHeight: 1.4 }}>
          <b style={{ color: '#2E3B24' }}>{t('weekly.rewardLabel')}</b>{' '}
          {t('weekly.reward', { xp: week.xp })}
        </span>
      </div>
      {error ? (
        <p role="alert" style={{ margin: 0, fontWeight: 800, fontSize: 13, color: '#8A1F0B' }}>
          {error}
        </p>
      ) : null}
      <Cta style={{ minHeight: 56 }} disabled={busy || cta === 'tomorrow'} onClick={onPlay}>
        {cta === 'tomorrow'
          ? t('weekly.cta.tomorrow')
          : t(cta === 'resume' ? 'weekly.cta.resume' : 'weekly.cta.play')}
      </Cta>
      <span style={{ ...MUTED, textAlign: 'center', fontWeight: 700 }}>{t('weekly.note')}</span>
    </>
  )
}
