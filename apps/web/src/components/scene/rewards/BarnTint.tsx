import { BARN_WALLS } from './RewardArt'

/**
 * The barn colour: a `mix-blend-mode: hue` layer over the walls (barn coordinates), the door cut out so it stays
 * red. It is drawn with the barn, in the landscape, so the animals in front of the barn are never tinted.
 */
export function BarnTint({ color }: { color: string }) {
  return <path data-reward="barnColor" d={BARN_WALLS} fillRule="evenodd" fill={color} opacity=".95" style={{ mixBlendMode: 'hue' }} />
}
