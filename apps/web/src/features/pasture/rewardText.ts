import type { PastureKey } from '@bc/game-core'
import type { PastureItemDto } from '@bc/protocol'
import type { TFunction } from 'i18next'
import { requirementOf } from './pastureModel'

export const itemName = (t: TFunction, key: PastureKey): string => t(`pasture.item.${key}.name`)

/** „ниво 15“, „значка „Ранобудник““, „серия 30 дни“; locked ones add „12 / 15“. */
export function requirementText(t: TFunction, item: PastureItemDto): string {
  const req = requirementOf(item.key)
  const base =
    req.kind === 'level'
      ? t('pasture.req.level', { level: req.level })
      : req.badge === 'streak'
        ? t('pasture.req.streak', { days: item.progress?.target ?? 30 })
        : t('pasture.req.badge', { badge: t(`badge.${req.badge}.name`) })
  return item.progress ? `${base} · ${t('pasture.progress', item.progress)}` : base
}
