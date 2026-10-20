import { useReducedMotion } from '../../hooks/useReducedMotion'
import { AnimalLayer } from './Animals'
import { Defs } from './Defs'
import { FogLayer } from './FogLayer'
import { Foreground, Landscape } from './Landscape'
import type { SceneAnimal } from './sceneAnimals'
import { Sky } from './Sky'

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

export function PastureScene({ fog, sunY, dawn, animals, parity, miss, label = 'Пасището', className }: PastureSceneProps) {
  const reduced = useReducedMotion()
  return (
    <svg
      className={className}
      role="img"
      aria-label={label}
      width="100%"
      height="100%"
      viewBox="0 0 390 380"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: 'block', position: 'absolute', inset: 0 }}
    >
      <Defs />
      <Sky dawn={dawn} sunY={sunY} reduced={reduced} />
      <Landscape />
      {parity ? <AnimalLayer layer="A" animals={animals} /> : <AnimalLayer layer="B" animals={animals} />}
      {miss ? <Puffs /> : null}
      <Foreground />
      <FogLayer fog={fog} reduced={reduced} />
    </svg>
  )
}
