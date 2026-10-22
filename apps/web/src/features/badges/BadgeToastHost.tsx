import type { BadgeStateDto, NewBadgeDto } from '@bc/protocol'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloseIcon } from '../../components/ui/icons'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { sfx } from '../../lib/sound'
import { BADGES_KEY } from '../stats/useBadges'
import { viewOfNew, type BadgeView } from './badgeModel'
import { BadgeDetail } from './BadgeDetail'
import { badgeName } from './BadgesTab'
import { Medallion } from './Medallion'
import { useBadgeToasts } from './toastStore'

/** How long one „Нова значка!“ stays before the next one. */
export const BADGE_TOAST_MS = 4000

const WRAP = {
  position: 'fixed',
  left: 12,
  right: 12,
  top: 'calc(12px + env(safe-area-inset-top, 0px))',
  zIndex: 60,
  display: 'flex',
  justifyContent: 'center',
  pointerEvents: 'none',
} as const
const TOAST = {
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 10px 8px 8px',
  borderRadius: 20,
  background: '#FFFDF6',
  border: '2px solid #E7E0CC',
  boxShadow: '0 14px 34px rgba(30,40,20,.25)',
  maxWidth: 420,
} as const
const OPEN = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 0,
  textAlign: 'left',
  minWidth: 0,
} as const

interface ToastProps {
  badge: NewBadgeDto
  view: BadgeView
  tick: number
  onOpen(): void
  onDismiss(): void
}

function BadgeToast({ view, tick, onOpen, onDismiss }: ToastProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const name = badgeName(view, t)
  return (
    <div style={WRAP}>
      <div key={tick} className={reduced ? undefined : 'rise'} role="status" aria-live="polite" style={TOAST} data-testid="badge-toast">
        <button type="button" style={OPEN} onClick={onOpen} aria-label={t('badges.openDetail')}>
          <Medallion glyph={view.def.glyph} md={view.md} className={reduced ? undefined : 'boing'} />
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <b style={{ fontSize: 15 }}>{t('badges.newBadge')}</b>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#4A5640', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name} · {t(`badges.tier.${view.tierName}`)}
            </span>
          </span>
        </button>
        <button type="button" className="iconbox icobtn" style={{ width: 36, height: 36 }} aria-label={t('badges.dismiss')} onClick={onDismiss}>
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  )
}

/**
 * Shows the queued new badge tiers one after another (`useBadgeToasts`); tapping one opens its detail.
 * `sticky`: no auto-dismiss (the dev gallery).
 */
export function BadgeToastHost({ sticky = false }: { sticky?: boolean }) {
  const qc = useQueryClient()
  const badge = useBadgeToasts((s) => s.queue[0] ?? null)
  const shown = useBadgeToasts((s) => s.shown)
  const [detail, setDetail] = useState<BadgeView | null>(null)
  const view = useMemo(
    () => (badge ? viewOfNew(badge, qc.getQueryData<BadgeStateDto[]>(BADGES_KEY)) : null),
    [badge, qc],
  )

  useEffect(() => {
    if (!badge) return
    sfx.play('pop')
    if (sticky) return
    const id = setTimeout(() => useBadgeToasts.getState().next(), BADGE_TOAST_MS)
    return () => clearTimeout(id)
  }, [badge, shown, sticky])

  function open() {
    if (view) setDetail(view)
    useBadgeToasts.getState().next()
  }

  return (
    <>
      {badge && view ? (
        <BadgeToast badge={badge} view={view} tick={shown} onOpen={open} onDismiss={() => useBadgeToasts.getState().next()} />
      ) : null}
      {detail ? <BadgeDetail view={detail} onClose={() => setDetail(null)} /> : null}
    </>
  )
}
