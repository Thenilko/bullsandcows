import { useReducedMotion } from '../../hooks/useReducedMotion'
import { AnimalLayer } from './Animals'
import { Defs } from './Defs'
import type { PastureSceneProps } from './PastureScene'
import { Barn, HayBales, House, Oak, Poplar, Well } from './wide/Buildings'
import { MeadowFlora } from './wide/Flora'
import { Scarecrow } from './wide/Scarecrow'
import { TallySign, type Tally } from './wide/Tally'
import { WideDefs, WideFog, WidePuffs } from './wide/WideFog'
import { Hills, Meadow, PenBack, WideForeground } from './wide/WideLandscape'
import { WideSky } from './wide/WideSky'
import { barnTint, has, WideBackRewards, WideFrontRewards, WideVane } from './rewards'

export type { Tally }

export interface WideSceneProps extends PastureSceneProps {
  /** Bulls and cows of the last guess, shown on the sign in front of the pen. */
  tally: Tally
  /** Window on the 1600×900 artboard, see `WIDE_VIEWBOX`. */
  viewBox: string
}

/** The two desktop crops of the 1600×900 artboard: full-bleed „immersive“ and the card of the „split“ layout. */
export const WIDE_VIEWBOX = {
  immersive: '80 0 1440 900',
  split: '200 200 1160 700',
} as const

const SVG_STYLE = { display: 'block', position: 'absolute', inset: 0 } as const

/**
 * The wide desktop pasture (PasWideScene): one SVG on the 1600×900 artboard, `xMidYMax slice` so the meadow and the
 * animals stay in view whatever the box ratio. The sun height comes from the caller (`wideSunY` in game-core).
 */
export function WideScene({ fog, sunY, dawn, animals, parity, miss, tally, viewBox, label = 'Пасището', className, pasture }: WideSceneProps) {
  const reduced = useReducedMotion()
  return (
    <div className={className} role="img" aria-label={label} style={SVG_STYLE}>
      <svg aria-hidden="true" width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMax slice" style={SVG_STYLE}>
        <Defs />
        <WideDefs />
        <WideSky dawn={dawn} sunY={sunY} reduced={reduced} />
        <Hills />
        <House reduced={reduced} />
        <Well />
        <Poplar x={290} y={540} scale={1.6} />
        <Poplar x={312} y={544} scale={1.3} />
        <Oak />
        <Poplar x={1370} y={520} scale={1.4} />
        <Poplar x={1392} y={524} scale={1.1} />
        <Meadow />
        <WideBackRewards pasture={pasture} />
        <Barn tint={barnTint(pasture)} plainVane={!has(pasture, 'goldenVane')} />
        <WideVane pasture={pasture} />
        <HayBales />
        <PenBack />
        <Scarecrow reduced={reduced} />
        <MeadowFlora />
        <TallySign tally={tally} parity={parity} />
        {parity ? <AnimalLayer layer="A" animals={animals} /> : <AnimalLayer layer="B" animals={animals} />}
        {miss ? <WidePuffs /> : null}
        <WideForeground />
        <WideFrontRewards pasture={pasture} />
        <WideFog fog={fog} reduced={reduced} />
      </svg>
    </div>
  )
}
