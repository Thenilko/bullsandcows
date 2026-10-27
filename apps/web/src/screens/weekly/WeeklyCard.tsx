import type { WeeklyDto } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ctaOf, ruleChips, timeLeft } from '../../features/weekly/weeklyModel'
import { KICKER } from './parts'

export interface WeeklyCardProps {
  week: WeeklyDto
  now: number
  busy?: boolean
  onPlay(): void
}

const ROW = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
} as const
const BUTTON = {
  minHeight: 38,
  background: '#FFF8EA',
  borderColor: '#FFF8EA',
  textShadow: 'none',
  flex: 'none',
} as const

function youText(t: ReturnType<typeof useTranslation>['t'], week: WeeklyDto): string {
  if (week.place !== null && week.best) {
    return t('weekly.card.you', {
      attempts: t('common.attemptsShort', { count: week.best.attempts }),
      place: week.place,
    })
  }
  return week.best ? t('weekly.card.youNoPlace') : t('weekly.card.none')
}

/** П6 / ПД10: the wooden card at the top of „Нова игра“; the kicker opens the week, the button plays. */
export function WeeklyCard({ week, now, busy = false, onPlay }: WeeklyCardProps) {
  const { t } = useTranslation()
  const cta = ctaOf(week)
  const rules = [...ruleChips(t, week.rule), `${week.xp} XP`].join(' · ')
  return (
    <section className="wk-card rise" aria-label={t('weekly.card.aria')} data-testid="weekly-card">
      <div style={ROW}>
        <Link to="/weekly" style={{ ...KICKER, color: 'inherit', textDecoration: 'none' }}>
          {t('weekly.kicker', { week: week.week })}
        </Link>
        <span className="tag" style={{ background: 'rgba(255,255,255,.2)', color: '#FFF8EA' }}>
          {t('weekly.card.left', { time: timeLeft(t, week.endsAt, now) })}
        </span>
      </div>
      <b style={{ fontSize: 24 }}>{t(`weekly.rule.${week.rule.key}`)}</b>
      <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.92 }}>{rules}</span>
      <div style={ROW}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>{youText(t, week)}</span>
        <button type="button" className="pill" style={BUTTON} disabled={busy} onClick={onPlay}>
          {t(
            cta === 'tomorrow'
              ? 'weekly.card.played'
              : cta === 'resume'
                ? 'weekly.card.resume'
                : 'weekly.card.play',
          )}
        </button>
      </div>
    </section>
  )
}
