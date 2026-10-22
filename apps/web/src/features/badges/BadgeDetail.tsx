import { useTranslation } from 'react-i18next'
import { Soft } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { Sheet } from '../../components/ui/Sheet'
import type { BadgeStep, BadgeView } from './badgeModel'
import { badgeName } from './BadgesTab'
import { Medallion } from './Medallion'

export interface BadgeDetailProps {
  view: BadgeView
  onClose(): void
}

const MUTED = { fontSize: 13, fontWeight: 800, color: '#6B7560' } as const
const BAR = { height: 12, borderRadius: 6, background: '#ECE5D2', overflow: 'hidden' } as const
const SOON = { background: '#F3EEDF', color: '#6B7560' } as const
const WIDTH = 440

function Step({ step, unit }: { step: BadgeStep; unit: BadgeView['unit'] }) {
  const { t } = useTranslation()
  return (
    <div className={cx('step', step.done && 'done')} data-done={step.done}>
      <span className={`md-dot ${step.md}`} aria-hidden="true" />
      <b>{t(`badges.tier.${step.tierName}`)}</b>
      <span>{t(`badges.need.${unit}`, { count: step.threshold })}</span>
    </div>
  )
}

/** Р3 „Значка — детайл“: the medallion, the steps with their thresholds and the progress to the next tier. */
export function BadgeDetail({ view, onClose }: BadgeDetailProps) {
  const { t } = useTranslation()
  const name = badgeName(view, t)
  const desc = view.secret ? t('badge.hidden.desc') : t(view.def.descKey)
  const soon = !view.def.available
  const progressText =
    view.next === null ? t('badges.allDone') : t('badges.progress', { progress: view.progress, next: view.next })
  return (
    <Sheet label={t('badges.detailAria')} onClose={onClose} width={WIDTH} centered testId="badge-detail">
      <Medallion glyph={view.def.glyph} md={view.md} xl className="boing" />
      <b style={{ fontSize: 24 }}>{name}</b>
      <span style={{ fontWeight: 700, color: '#4A5640', lineHeight: 1.45 }}>{desc}</span>
      {soon ? (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span className="tag" style={SOON}>
            {t('badges.soon')}
          </span>
          <span style={MUTED}>{t('badges.soonNote')}</span>
        </span>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${view.steps.length}, minmax(0, 1fr))`, gap: 8, width: '100%' }} data-testid="badge-steps">
        {view.steps.map((s) => (
          <Step key={s.tierName} step={s} unit={view.unit} />
        ))}
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={BAR} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.fraction * 100)} aria-label={name}>
          <div className="hbar" style={{ height: '100%', width: `${Math.round(view.fraction * 100)}%`, background: '#5E9E46' }} />
        </div>
        <span style={MUTED} data-testid="badge-progress">
          {progressText}
        </span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7560' }}>{t('badges.xpNote')}</span>
      <Soft style={{ width: '100%' }} onClick={onClose}>
        {t('common.close')}
      </Soft>
    </Sheet>
  )
}
