import type { ReactNode } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { AnimalLayer } from './Animals'
import { Defs } from './Defs'
import { FogLayer } from './FogLayer'
import { Foreground, Landscape } from './Landscape'
import { barnTint, MobileBackRewards, MobileFrontRewards, MobilePenRewards, type ScenePasture } from './rewards'
import type { SceneAnimal } from './sceneAnimals'
import { Sky } from './Sky'
import { SkyLayer } from './SkyLayer'

export interface PastureSceneProps {
  fog: number
  sunY: number
  dawn: number
  animals: readonly SceneAnimal[]
  /** Selects animal layer A (true) or B (false); flipping it restarts the CSS animations. */
  parity: boolean
  miss: boolean
  label?: string
  className?: string
  /** The player's pasture rewards and barn colour; absent: the plain pasture. */
  pasture?: ScenePasture
}

const PUFFS = [
  { cx: 262, cy: 304, r: 18, delay: undefined },
  { cx: 296, cy: 314, r: 16, delay: '.14s' },
  { cx: 236, cy: 318, r: 14, delay: '.26s' },
] as const

function Puffs() {
  return (
    <>
      {PUFFS.map((p) => (
        <circle
          key={p.cx}
          className="ps-puff"
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill="url(#psDust)"
          style={p.delay ? { animationDelay: p.delay } : undefined}
        />
      ))}
    </>
  )
}

const SVG_STYLE = { display: 'block', position: 'absolute', inset: 0 } as const

/**
 * One plane of the drawing: all planes share the 390x380 viewBox and stack exactly. The sun's rays and the
 * animals' idle motion (tail, breath, head, bell) repaint their own plane only; in one svg they re-rasterized
 * the sky, the hills and the barn every frame. Gradient and clip ids from `Defs` (sky plane) resolve
 * document-wide. The clouds and birds (SkyLayer) sit between the sky and the land, as in the design.
 */
function Plane({ name, children }: { name: 'sky' | 'land' | 'animals' | 'front'; children: ReactNode }) {
  return (
    <svg data-plane={name} aria-hidden="true" width="100%" height="100%" viewBox="0 0 390 380" preserveAspectRatio="xMidYMid slice" style={SVG_STYLE}>
      {children}
    </svg>
  )
}

/**
 * Stacked SVG planes on the 390x380 design viewBox, `xMidYMid slice` as in PasScene: a box of another ratio shows the
 * middle of the artboard. The mobile shell sizes the box itself (MobileShell.module.css `.art`), so compact
 * phones get the design's `xMidYMax slice` (meadow and animals kept, sky cut) without a second render.
 */
export function PastureScene({ fog, sunY, dawn, animals, parity, miss, label = 'Пасището', className, pasture }: PastureSceneProps) {
  const reduced = useReducedMotion()
  return (
    <div className={className} role="img" aria-label={label} style={SVG_STYLE}>
      <Plane name="sky">
        <Defs />
        <Sky dawn={dawn} sunY={sunY} reduced={reduced} />
      </Plane>
      <SkyLayer reduced={reduced} />
      <Plane name="land">
        <Landscape barnTint={barnTint(pasture)}>
          <MobileBackRewards pasture={pasture} />
        </Landscape>
      </Plane>
      <Plane name="animals">
        <MobilePenRewards pasture={pasture} />
        {parity ? <AnimalLayer layer="A" animals={animals} /> : <AnimalLayer layer="B" animals={animals} />}
        {miss ? <Puffs /> : null}
      </Plane>
      <Plane name="front">
        <Foreground />
        <MobileFrontRewards pasture={pasture} />
      </Plane>
      <FogLayer fog={fog} reduced={reduced} />
    </div>
  )
}
