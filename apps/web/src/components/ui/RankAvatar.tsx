import type { RankKey } from '@bc/protocol'
import { useTranslation } from 'react-i18next'
import { BullHead, CowHead } from './characters'
import { cx } from './cx'
import { RANK_ACCESSORY } from './rankAccessories'

export type Species = 'bull' | 'cow'

/** Ring colour per title, from the design board „Персонажи по ниво · 6 титли“. */
export const RANK_RING: Readonly<Record<RankKey, string>> = {
  calf: '#C9C2B0',
  herdsman: '#C48E55',
  shepherd: '#5E9E46',
  pastor: '#4A7FB0',
  steward: '#8E5BA8',
  chiefBull: '#E2B44A',
}

const INNER_BG: Readonly<Record<Species, string>> = { bull: '#D7EBF5', cow: '#DCEBCF' }

/** Head plus accessory box of the design board: 140 wide, 152 tall. */
const HEAD_BOX = '-70 -84 140 152'
const HEAD_BOX_RATIO = 152 / 140
const CALF_SCALE = 0.86

export interface RankHeadProps {
  species: Species
  rankKey: RankKey
  /** Width in px; the height follows the 140×152 box. */
  size?: number
}

/** The `<g>` parts only: accessory behind, head, accessory in front. */
export function RankHeadParts({ species, rankKey }: Pick<RankHeadProps, 'species' | 'rankKey'>) {
  const calf = rankKey === 'calf'
  const accessory = RANK_ACCESSORY[rankKey]
  return (
    <g data-rank={rankKey} transform={calf ? `scale(${CALF_SCALE})` : undefined}>
      {accessory.back}
      {species === 'bull' ? <BullHead calf={calf} /> : <CowHead calf={calf} />}
      {accessory.front}
    </g>
  )
}

/** A small decorative head with its accessory and no ring (the result screen). */
export function RankHead({ species, rankKey, size = 40 }: RankHeadProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * HEAD_BOX_RATIO)}
      viewBox={HEAD_BOX}
      aria-hidden="true"
      data-rank-head={rankKey}
    >
      <RankHeadParts species={species} rankKey={rankKey} />
    </svg>
  )
}

export interface RankAvatarProps {
  species: Species
  rankKey: RankKey
  size?: number
  /** Rocks the avatar with the `think` animation (the opponent is choosing a guess). */
  thinking?: boolean
  /** The weekly challenge's gold frame (top 10 of the previous week) is active. */
  gold?: boolean
}

/** Round avatar: ring in the title's colour, tinted inner disc, the head with its accessory. */
export function RankAvatar({ species, rankKey, size = 52, thinking = false, gold = false }: RankAvatarProps) {
  const { t } = useTranslation()
  const label = `${t(`species.${species}`)}, ${t(`rank.${rankKey}`)}${gold ? `, ${t('weekly.goldFrame')}` : ''}`
  return (
    <span className={cx('rav', thinking && 'think', gold && 'gold')} style={{ width: size, height: size }} data-gold={gold || undefined}>
      <svg width={size} height={size} viewBox="-80 -80 160 160" role="img" aria-label={label}>
        <circle r="76" fill={RANK_RING[rankKey]} stroke="#2E3B24" strokeWidth="4" />
        <circle r="66" fill={INNER_BG[species]} stroke="#2E3B24" strokeWidth="3" />
        <g transform="translate(0 8) scale(0.96)">
          <RankHeadParts species={species} rankKey={rankKey} />
        </g>
      </svg>
    </span>
  )
}
