import { Bull } from './Bull'
import { Cow } from './Cow'
import type { SceneAnimal } from './sceneAnimals'

interface AnimalLayerProps {
  layer: 'A' | 'B'
  animals: readonly SceneAnimal[]
}

/** One animal layer; the scene mounts exactly one of A/B so CSS animations restart on a new move. */
export function AnimalLayer({ layer, animals }: AnimalLayerProps) {
  return (
    <g data-layer={`animals-${layer}`}>
      {animals.map((a) => (
        <g key={`${a.kind}-${a.x}-${a.y}`} transform={`translate(${a.x} ${a.y}) scale(${a.scale})`}>
          <g className={`a-${a.motion}`} style={{ '--d': a.delay } as React.CSSProperties}>
            {a.kind === 'bull' ? <Bull /> : <Cow />}
          </g>
        </g>
      ))}
    </g>
  )
}
