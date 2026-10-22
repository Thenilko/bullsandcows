import { BADGE_KEYS, type BadgeKey } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui'
import type { BadgeVariant } from '../../components/ui/icons'

const DEFAULT_BG = '#F6E3B4'
const BG: Readonly<Partial<Record<BadgeKey, string>>> = {
  noWaste: '#DCEFD0',
  underMinute: '#D7E9F7',
  streak: '#F9D7C8',
  five: '#E7DDF6',
}
const VARIANTS = 6

export function BadgeGrid({
  badges,
  detailed = false,
}: {
  badges: Readonly<Partial<Record<BadgeKey, boolean>>>
  /** Desktop: bigger icons with the description under each name. */
  detailed?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: detailed ? 10 : 8,
      }}
    >
      {BADGE_KEYS.map((key, i) => (
        <Badge
          key={key}
          variant={((i % VARIANTS) + 1) as BadgeVariant}
          bg={BG[key] ?? DEFAULT_BG}
          name={t(`badge.${key}.name`)}
          title={t(`badge.${key}.desc`)}
          locked={!badges[key]}
          size={detailed ? 46 : 40}
          desc={detailed ? t(`badge.${key}.desc`) : undefined}
        />
      ))}
    </div>
  )
}
