import { nextLevelUnlock, pastureItem, type PastureKey } from '@bc/game-core'
import { useTranslation } from 'react-i18next'
import { Cta, Soft } from '../../components/ui'
import { Sheet } from '../../components/ui/Sheet'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { RewardIcon } from './RewardIcon'

export interface UnlockModalProps {
  item: PastureKey
  /** The player's level now: the „next reward“ line of a badge reward counts from it. */
  level: number
  onPut(): void
  onLater(): void
}

const MEDALLION = {
  width: 150,
  height: 150,
  borderRadius: '50%',
  background: 'radial-gradient(#FFF6CF, #F3EEDF 70%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
} as const
const KICKER = { fontSize: 12, fontWeight: 900, letterSpacing: '.14em', color: 'var(--c-muted-aa)', textTransform: 'uppercase' } as const

/** П2 / ПД3 „Ниво N · ново в пасището“: the reward, a line about it and the next one; put it in or later. */
export function UnlockModal({ item, level, onPut, onLater }: UnlockModalProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const req = pastureItem(item).requirement
  const kicker =
    req.kind === 'level'
      ? t('pasture.unlock.kickerLevel', { level: req.level })
      : t('pasture.unlock.kickerBadge', { badge: t(`badge.${req.badge}.name`) })
  const next = nextLevelUnlock(req.kind === 'level' ? req.level : level)
  const name = t(`pasture.item.${item}.name`)
  return (
    <Sheet label={t('pasture.unlock.aria')} onClose={onLater} width={520} centered variant="card" testId="unlock-modal">
      <span style={KICKER}>{kicker}</span>
      <div className={reduced ? undefined : 'boing'} style={MEDALLION}>
        <RewardIcon item={item} size={120} />
      </div>
      <b style={{ fontSize: 28 }}>{name}</b>
      <span style={{ fontWeight: 700, color: '#4A5640', lineHeight: 1.45 }}>
        {t(`pasture.item.${item}.desc`)}
        {next ? ` ${t('pasture.unlock.next', { name: t(`pasture.item.${next.key}.name`), level: next.requirement.kind === 'level' ? next.requirement.level : 0 })}` : null}
      </span>
      <Cta style={{ width: '100%', minHeight: 54 }} onClick={onPut}>
        {t(`pasture.unlock.put.${item}`)}
      </Cta>
      <Soft style={{ width: '100%' }} onClick={onLater}>
        {t('pasture.unlock.later')}
      </Soft>
    </Sheet>
  )
}
