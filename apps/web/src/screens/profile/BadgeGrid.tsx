import { BADGE_KEYS, type BadgeKey } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui'
import type { BadgeVariant } from '../../components/ui/icons'

const BG: Readonly<Record<BadgeKey, string>> = {
  firstBull: '#F6E3B4',
  noWaste: '#DCEFD0',
  underMinute: '#D7E9F7',
  streak7: '#F9D7C8',
  chiefBull: '#F6E3B4',
  fiveDigits: '#E7DDF6',
}

export function BadgeGrid({
  badges,
  detailed = false,
}: {
  badges: Readonly<Record<BadgeKey, boolean>>
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
          variant={(i + 1) as BadgeVariant}
          bg={BG[key]}
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
