import type { CSSProperties, ReactNode } from 'react'

/** Artboard units of the mobile scene (PastureScene's viewBox). */
const ART_W = 390
const ART_H = 380

const pct = (n: number, of: number) => `${Math.round((n / of) * 10000) / 100}%`

/** A cloud sprite's box in artboard units: its origin is the cloud's centre, as the design's `translate(0 y)`. */
const CLOUD_BOX = { x: -40, y: -26, w: 80, h: 40 } as const
/** A bird sprite's box; the design's `ps-fly` path is re-expressed in this box (see pasishte.css `ps-fly-h`). */
const BIRD_BOX = { x: -2, y: -2, w: 22, h: 12 } as const

const CLOUDS = [
  { dur: '38s', delay: '-6s', y: 56, opacity: 0.95, still: 80, shapes: [[0, 0, 32, 10], [-8, -8, 15, 12], [12, -10, 16, 13]] },
  { dur: '52s', delay: '-30s', y: 106, opacity: 0.8, still: 250, shapes: [[0, 0, 24, 8], [6, -7, 12, 10]] },
  { dur: '46s', delay: '-18s', y: 30, opacity: 0.7, still: 170, shapes: [[0, 0, 26, 8], [-6, -6, 12, 9], [10, -7, 12, 10]] },
] as const

const BIRD_PATH = 'M1 6 Q5 1 9 5 Q13 1 17 6'
const BIRDS = [
  { key: 'near', x: 0, y: 92, scale: 1, stroke: 1.6, delay: undefined, still: 120 },
  { key: 'far', x: 6, y: 110, scale: 0.7, stroke: 2, delay: '-.6s', still: 300 },
] as const
const BIRD_DUR = '18s'

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

interface SpriteProps {
  box: Box
  /** Artboard position of the sprite's origin. */
  at: { x: number; y: number }
  reduced: boolean
  motion: 'ps-cloud' | 'ps-bird'
  dur: string
  delay: string | undefined
  /** Artboard x where the sprite parks under reduced motion. */
  still: number
  children: ReactNode
}

/** One sprite: an svg box placed in artboard percentages; its drift is a CSS transform of the box itself. */
function Sprite({ box, at, reduced, motion, dur, delay, still, children }: SpriteProps) {
  const style: CSSProperties = {
    left: pct(at.x + box.x, ART_W),
    top: pct(at.y + box.y, ART_H),
    width: pct(box.w, ART_W),
    height: pct(box.h, ART_H),
    ...(reduced
      ? { transform: `translateX(${pct(still, box.w)})` }
      : { animationDuration: dur, ...(delay ? { animationDelay: delay } : {}) }),
  }
  return (
    <svg
      aria-hidden="true"
      className={reduced ? 'ps-sprite' : `ps-sprite ${motion}`}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      style={style}
    >
      {children}
    </svg>
  )
}

/**
 * Clouds and birds of the mobile scene as an HTML layer over the drawing (they never overlap the mountains, so
 * the paint order is unchanged). A CSS transform animation inside the svg repaints the whole drawing every
 * frame; on its own box it stays on the compositor and the drawing is rasterized once.
 */
export function SkyLayer({ reduced }: { reduced: boolean }) {
  return (
    <div data-layer="sky" className="ps-skyl">
      {CLOUDS.map((c) => (
        <Sprite key={c.y} box={CLOUD_BOX} at={{ x: 0, y: c.y }} reduced={reduced} motion="ps-cloud" dur={c.dur} delay={c.delay} still={c.still}>
          <g fill="#FFFFFF" opacity={c.opacity}>
            {c.shapes.map(([cx, cy, rx, ry]) => (
              <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} />
            ))}
          </g>
        </Sprite>
      ))}
      {BIRDS.map((b) => (
        <Sprite key={b.key} box={BIRD_BOX} at={{ x: b.x, y: b.y }} reduced={reduced} motion="ps-bird" dur={BIRD_DUR} delay={b.delay} still={b.still}>
          <g transform={b.scale === 1 ? undefined : `scale(${b.scale})`}>
            <path d={BIRD_PATH} stroke="#2E3B24" strokeWidth={b.stroke} fill="none" strokeLinecap="round" />
          </g>
        </Sprite>
      ))}
    </div>
  )
}
