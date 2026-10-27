import type { WeeklyAwardDto, WeeklyRuleKey } from '@bc/protocol'
import { WEEKLY_GOLD_TOP } from '@bc/game-core'
import { useTranslation } from 'react-i18next'
import { Cta, Soft } from '../../components/ui'
import { Sheet } from '../../components/ui/Sheet'
import { betterThan } from '../../features/weekly/weeklyModel'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { formatClock } from '../play/format'
import { StarMedal } from './parts'

export interface WeeklyAwardModalProps {
  award: WeeklyAwardDto
  /** The week now running and its rule („Към седмица N+1 · …“). */
  next: { week: number; rule: WeeklyRuleKey }
  onNext(): void
  onBoard(): void
}

const KICKER = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '.14em',
  color: 'var(--c-muted-aa)',
  textTransform: 'uppercase',
} as const
const TILE_LABEL = { fontSize: 12, fontWeight: 800, color: 'var(--c-muted-aa)' } as const
const NOTE = { fontSize: 13, fontWeight: 700, color: 'var(--c-muted-aa)' } as const

function bestLine(t: ReturnType<typeof useTranslation>['t'], award: WeeklyAwardDto): string | null {
  if (award.place === null || award.attempts === null) return null
  const best = t('weekly.award.best', {
    attempts: t('common.attempts', { count: award.attempts }),
    time: award.secs === null ? '—' : formatClock(award.secs),
  })
  const pct = betterThan(award.place, award.participants)
  return pct === null ? best : `${best} · ${t('weekly.award.better', { pct })}`
}

function frameLine(t: ReturnType<typeof useTranslation>['t'], award: WeeklyAwardDto): string {
  if (award.goldFrame) return t('weekly.award.framed')
  if (award.place === null) return t('weekly.award.tryNext')
  return t('weekly.award.toFrame', { count: award.place - WEEKLY_GOLD_TOP })
}

/** П8 / ПД12: the end of the week, once (a card over the scene on phones, the framed modal on desktop). */
export function WeeklyAwardModal({ award, next, onNext, onBoard }: WeeklyAwardModalProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const best = bestLine(t, award)
  return (
    <Sheet
      label={t('weekly.award.aria')}
      onClose={onNext}
      width={520}
      centered
      variant="card"
      testId="weekly-award"
    >
      <span style={KICKER}>{t('weekly.award.kicker', { week: award.week })}</span>
      <StarMedal size={110} glyph={52} className={reduced ? 'md-xl' : 'md-xl boing'} />
      <b style={{ fontSize: 26 }}>
        {award.place === null
          ? t('weekly.award.noPlace')
          : t('weekly.award.place', { place: award.place, count: award.participants })}
      </b>
      {best ? <span style={{ fontWeight: 700, color: '#4A5640' }}>{best}</span> : null}
      {award.won ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
          <div className="inset" style={{ padding: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#3F7A2E' }}>+{award.xp}</div>
            <div style={TILE_LABEL}>{t('weekly.award.xp')}</div>
          </div>
          <div className="inset" style={{ padding: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{t('weekly.award.badge')}</div>
            <div style={TILE_LABEL}>{t('weekly.award.badgeLabel', { count: award.weeksWon })}</div>
          </div>
        </div>
      ) : null}
      <span style={NOTE}>{frameLine(t, award)}</span>
      <Cta style={{ width: '100%', minHeight: 54 }} onClick={onNext}>
        {t('weekly.award.next', { week: next.week, rule: t(`weekly.rule.${next.rule}`) })}
      </Cta>
      <Soft style={{ width: '100%' }} onClick={onBoard}>
        {t('weekly.award.board')}
      </Soft>
    </Sheet>
  )
}
