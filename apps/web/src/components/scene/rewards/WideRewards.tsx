import { Beehive, Dog, GoldenVane, Pond, Rooster, Shed, Sunflower, Windmill } from './RewardArt'
import { has, type ScenePasture } from './types'

/** The rewards on the wide desktop scene (1600×900, PasExtrasDesk ПД2), in the scene's paint order. */
interface Props {
  pasture: ScenePasture | undefined
}

/** Far away, behind the barn and the pen: the windmill on the hill, the second barn and the beehive. */
export function WideBackRewards({ pasture }: Props) {
  if (!pasture) return null
  return (
    <>
      {has(pasture, 'windmill') ? (
        <g data-reward="windmill" transform="translate(360 470) scale(2.4)">
          <Windmill />
        </g>
      ) : null}
      {has(pasture, 'shed') ? (
        <g data-reward="shed" transform="translate(1000 560) scale(2.2)">
          <Shed />
        </g>
      ) : null}
      {has(pasture, 'beehive') ? (
        <g data-reward="beehive" transform="translate(1270 560) scale(2.2)">
          <Beehive />
        </g>
      ) : null}
    </>
  )
}

/** On the barn's ridge, in the barn's own coordinates (see `Barn`). */
export function WideVane({ pasture }: Props) {
  if (!has(pasture, 'goldenVane')) return null
  return (
    <g data-reward="goldenVane" transform="translate(440 640) scale(2) translate(-15 -263) translate(70 152)">
      <GoldenVane />
    </g>
  )
}

const FLOWER_X = [150, 192, 234] as const

/** In front of the pen's front rail: the rooster on the rail, the sunflowers, the dog and the pond. */
export function WideFrontRewards({ pasture }: Props) {
  if (!pasture) return null
  return (
    <>
      {has(pasture, 'rooster') ? (
        <g data-reward="rooster" transform="translate(760 700) scale(1.92)">
          <Rooster />
        </g>
      ) : null}
      {has(pasture, 'sunflowers') ? (
        <g data-reward="sunflowers">
          {FLOWER_X.map((x) => (
            <g key={x} transform={`translate(${x} 745) scale(2.2)`}>
              <Sunflower />
            </g>
          ))}
        </g>
      ) : null}
      {has(pasture, 'pond') ? (
        <g data-reward="pond" transform="translate(1180 830) scale(2.6)">
          <Pond />
        </g>
      ) : null}
      {has(pasture, 'dog') ? (
        <g data-reward="dog" transform="translate(960 778) scale(2.4)">
          <Dog />
        </g>
      ) : null}
    </>
  )
}
