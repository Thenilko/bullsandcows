import type { BarnColor, PastureKey } from '@bc/game-core'
import { BARN_COLORS } from '@bc/game-core'
import type { ReactElement } from 'react'
import { BarnShapes } from '../../components/scene/Landscape'
import { Beehive, Dog, GoldenVane, Pond, Rooster, Shed, Sunflower, Windmill } from '../../components/scene/rewards'

/** Each reward's drawing and the box around it (PasExtras `.unl-ic` and the П2 medallion). */
const ART: Readonly<Record<PastureKey, { viewBox: string; art: (color: BarnColor) => ReactElement }>> = {
  dog: { viewBox: '-28 -30 56 56', art: () => <Dog /> },
  sunflowers: { viewBox: '-16 -16 32 52', art: () => <Sunflower /> },
  beehive: { viewBox: '-22 -28 44 50', art: () => <Beehive /> },
  rooster: { viewBox: '-14 -26 34 36', art: () => <Rooster /> },
  windmill: { viewBox: '-30 -74 60 80', art: () => <Windmill /> },
  pond: { viewBox: '-62 -32 124 52', art: () => <Pond /> },
  barnColor: {
    viewBox: '8 150 150 122',
    art: (color) => <BarnShapes tint={color === 'red' ? null : BARN_COLORS[color]} />,
  },
  shed: { viewBox: '-8 -36 44 40', art: () => <Shed /> },
  goldenVane: { viewBox: '-14 -18 30 34', art: () => <GoldenVane /> },
}

export interface RewardIconProps {
  item: PastureKey
  size: number
  /** The barn icon in this colour (the barn colour reward). */
  color?: BarnColor
}

export function RewardIcon({ item, size, color = 'blue' }: RewardIconProps) {
  const { viewBox, art } = ART[item]
  return (
    <svg width={size} height={size} viewBox={viewBox} aria-hidden="true" data-reward-icon={item}>
      {art(color)}
    </svg>
  )
}

export function LockIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9CA394" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
