import { Beehive, Dog, GoldenVane, Pond, Rooster, Shed, Sunflower, Windmill } from './RewardArt'
import { has, type ScenePasture } from './types'

/**
 * The rewards on the phone scene (390×380, PasExtras П1). Three layers, like the scene's planes: behind the
 * animals (land plane), in front of the back fence but behind the animals (animal plane), and the foreground.
 */
interface Props {
  pasture: ScenePasture | undefined
}

/** Windmill, second barn, golden vane on the ridge, the beehive under the trees and the rooster on the fence. */
export function MobileBackRewards({ pasture }: Props) {
  if (!pasture) return null
  return (
    <>
      {has(pasture, 'windmill') ? (
        <g data-reward="windmill" transform="translate(272 214)">
          <Windmill />
        </g>
      ) : null}
      {has(pasture, 'shed') ? (
        <g data-reward="shed" transform="translate(176 232)">
          <Shed />
        </g>
      ) : null}
      {has(pasture, 'goldenVane') ? (
        <g data-reward="goldenVane" transform="translate(70 152)">
          <GoldenVane />
        </g>
      ) : null}
      {has(pasture, 'beehive') ? (
        <g data-reward="beehive" transform="translate(318 236)">
          <Beehive />
        </g>
      ) : null}
      {has(pasture, 'rooster') ? (
        <g data-reward="rooster" transform="translate(104 256) scale(.75)">
          <Rooster />
        </g>
      ) : null}
    </>
  )
}

const FLOWERS = [
  [212, 236, 0.8],
  [232, 232, 0.95],
  [254, 238, 0.85],
] as const

/** The dog and the sunflowers, in front of the pen's back fence (the animals are drawn after them). */
export function MobilePenRewards({ pasture }: Props) {
  if (!pasture) return null
  return (
    <>
      {has(pasture, 'sunflowers') ? (
        <g data-reward="sunflowers">
          {FLOWERS.map(([x, y, s]) => (
            <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
              <Sunflower />
            </g>
          ))}
        </g>
      ) : null}
      {has(pasture, 'dog') ? (
        <g data-reward="dog" transform="translate(150 262)">
          <Dog />
        </g>
      ) : null}
    </>
  )
}

/** The pond in the foreground, right of the pen. */
export function MobileFrontRewards({ pasture }: Props) {
  if (!has(pasture, 'pond')) return null
  return (
    <g data-reward="pond" transform="translate(340 352) scale(.85)">
      <Pond />
    </g>
  )
}
