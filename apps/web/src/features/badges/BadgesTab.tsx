import type { BadgeStateDto } from '@bc/protocol'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { badgeViews, collectionSummary, groupBadges, type BadgeGroup, type BadgeView } from './badgeModel'
import { Medallion } from './Medallion'

export interface BadgesData {
  states: readonly BadgeStateDto[] | undefined
  loading: boolean
  error: boolean
}

export interface BadgesTabProps {
  badges: BadgesData
  /** Guests see the whole collection locked and a line asking them to sign in. */
  guest: boolean
  onOpen(view: BadgeView): void
  /** The narrower desktop column: tighter grid. */
  desktop?: boolean
}

const BAR = { height: 10, borderRadius: 5, background: '#ECE5D2', overflow: 'hidden' } as const
const MUTED = { fontSize: 12, fontWeight: 800, color: 'var(--c-muted-aa)' } as const
const COLUMNS = 4

/** The display name: „???“ for a hidden badge not earned yet. */
export function badgeName(view: BadgeView, t: (key: string) => string): string {
  return view.secret ? t('badge.hidden.name') : t(view.def.nameKey)
}

function Collection({ views, guest }: { views: readonly BadgeView[]; guest: boolean }) {
  const { t } = useTranslation()
  const s = collectionSummary(views)
  return (
    <Card style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }} data-testid="badge-collection">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6, minWidth: 0 }}>
        <b style={{ fontSize: 18 }}>{t('badges.collection')}</b>
        <div style={BAR} role="progressbar" aria-valuemin={0} aria-valuemax={s.total} aria-valuenow={s.earned} aria-label={t('badges.collection')}>
          <div className="hbar" style={{ height: '100%', width: `${Math.round(s.fraction * 100)}%`, background: '#5E9E46' }} />
        </div>
        <span style={MUTED}>{guest ? t('badges.guestNote') : t('badges.summary', { earned: s.earned, tiers: s.tiers, left: s.left })}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
        <span className="md-dot md-bronze" />
        <span className="md-dot md-silver" />
        <span className="md-dot md-gold" />
      </div>
    </Card>
  )
}

function Tile({ view, onOpen }: { view: BadgeView; onOpen(view: BadgeView): void }) {
  const { t } = useTranslation()
  const name = badgeName(view, t)
  return (
    <button
      type="button"
      className={cx('bdg', view.locked && 'locked', view.secret && 'hidden')}
      aria-label={t('badges.tileAria', { name, tier: t(`badges.tier.${view.tierName}`) })}
      data-badge={view.key}
      data-tier={view.tier}
      onClick={() => onOpen(view)}
    >
      <Medallion glyph={view.def.glyph} md={view.md} />
      <span className="bdg-name">{name}</span>
      <span className="pips" aria-hidden="true">
        {view.pips.map((p, i) => (
          <i key={i} className={p} />
        ))}
      </span>
    </button>
  )
}

function Group({ group, onOpen, desktop }: { group: BadgeGroup; onOpen(view: BadgeView): void; desktop: boolean }) {
  const { t } = useTranslation()
  const id = `badges-${group.category}`
  return (
    <section aria-labelledby={id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <b id={id} style={{ fontSize: 16 }}>
          {t(`badges.category.${group.category}`)}
        </b>
        <span style={MUTED}>{t('badges.count', { earned: group.earned, total: group.items.length })}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`, gap: desktop ? 6 : 8 }}>
        {group.items.map((v) => (
          <Tile key={v.key} view={v} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

/** Р2 „Значки — колекция“: the „Колекция“ card and the 8 groups in 4-column grids. */
export function BadgesTab({ badges, guest, onOpen, desktop = false }: BadgesTabProps) {
  const { t } = useTranslation()
  const views = useMemo(() => badgeViews(badges.states), [badges.states])
  const groups = useMemo(() => groupBadges(views), [views])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-testid="badges-tab">
      <Collection views={views} guest={guest} />
      {badges.error && !badges.states ? (
        <p role="alert" style={{ margin: 0, fontWeight: 800, textAlign: 'center' }}>
          {t('error.unknown')}
        </p>
      ) : null}
      {badges.loading && !badges.states ? (
        <p role="status" style={{ margin: 0, ...MUTED, textAlign: 'center' }}>
          {t('common.loading')}
        </p>
      ) : null}
      {groups.map((g) => (
        <Group key={g.category} group={g} onOpen={onOpen} desktop={desktop} />
      ))}
    </div>
  )
}
