import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Seg } from '../../components/ui'
import { sfx } from '../../lib/sound'

export type BoardTab = 'all' | 'farm'

/** Р4 / ПД4: „Всички играчи / Семейна ферма“ at the top of the board; each side is its own route. */
export function BoardSwitch({ value }: { value: BoardTab }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <Seg
      value={value}
      label={t('farm.switch.aria')}
      options={[
        { value: 'all', label: t('farm.switch.all') },
        { value: 'farm', label: t('farm.switch.farm') },
      ]}
      onChange={(next) => {
        if (next === value) return
        sfx.play('tap')
        void navigate(next === 'farm' ? '/farm' : '/board')
      }}
    />
  )
}
