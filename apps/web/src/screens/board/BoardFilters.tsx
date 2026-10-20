import { useTranslation } from 'react-i18next'
import { Seg, Toggle } from '../../components/ui'
import type { Period } from '../../features/stats/useLeaderboard'

export type BoardLen = 3 | 4 | 5

export interface BoardFilterState {
  period: Period
  len: BoardLen
  zero: boolean
}

const PERIODS: readonly Period[] = ['today', 'week', 'all']
const LENS: readonly BoardLen[] = [3, 4, 5]

export interface BoardFiltersProps {
  value: BoardFilterState
  onChange(next: BoardFilterState): void
  /** Desktop splits the controls: tabs in the card header, digits and zero below it. */
  part?: 'all' | 'period' | 'options'
}

export function BoardFilters({ value, onChange, part = 'all' }: BoardFiltersProps) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {part !== 'options' ? (
        <Seg
          label={t('board.period')}
          value={value.period}
          options={PERIODS.map((p) => ({ value: p, label: t(`board.tab.${p}`) }))}
          onChange={(period) => onChange({ ...value, period })}
        />
      ) : null}
      {part !== 'period' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <Seg
            label={t('newGame.digits')}
            value={String(value.len) as `${BoardLen}`}
            options={LENS.map((l) => ({ value: String(l) as `${BoardLen}`, label: String(l) }))}
            onChange={(len) => onChange({ ...value, len: Number(len) as BoardLen })}
          />
          <span
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13 }}
          >
            {t('newGame.zero.label')}
            <Toggle
              on={value.zero}
              label={t('newGame.zero.aria')}
              onChange={(zero) => onChange({ ...value, zero })}
            />
          </span>
        </div>
      ) : null}
    </div>
  )
}
