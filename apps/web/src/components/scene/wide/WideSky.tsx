interface WideSkyProps {
  dawn: number
  sunY: number
  reduced: boolean
}

const CLOUD_SHAPES = [
  [0, 0, 32, 10],
  [-8, -8, 15, 12],
  [12, -10, 16, 13],
] as const

/** Five clouds drifting across the 1600 artboard; `still` is where each one rests under reduced motion. */
const CLOUDS = [
  { dur: '70s', delay: '-10s', y: 110, scale: 2.2, opacity: 0.95, still: 260 },
  { dur: '90s', delay: '-52s', y: 190, scale: 1.6, opacity: 0.8, still: 900 },
  { dur: '80s', delay: '-30s', y: 70, scale: 1.8, opacity: 0.75, still: 1180 },
  { dur: '100s', delay: '-75s', y: 250, scale: 1.3, opacity: 0.7, still: 1420 },
  { dur: '120s', delay: '-95s', y: 150, scale: 2.6, opacity: 0.9, still: 620 },
] as const

const BIRD_PATH = 'M1 6 Q5 1 9 5 Q13 1 17 6'
const BIRD_DUR = '34s'
const BIRD_STILL = 640
const BIRDS = [
  { delay: '0s', x: 0, y: 200, scale: 1.3 },
  { delay: '-.5s', x: 14, y: 214, scale: 1 },
  { delay: '-1s', x: 28, y: 226, scale: 0.8 },
] as const

function Clouds({ reduced }: { reduced: boolean }) {
  return (
    <>
      {CLOUDS.map((c) => {
        const body = (
          <g transform={`translate(0 ${c.y}) scale(${c.scale})`} fill="#FFFFFF" opacity={c.opacity}>
            {CLOUD_SHAPES.map(([cx, cy, rx, ry]) => (
              <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} />
            ))}
          </g>
        )
        return reduced ? (
          <g key={c.y} transform={`translate(${c.still} 0)`}>{body}</g>
        ) : (
          <g key={c.y} className="ps-cloudw" style={{ animationDuration: c.dur, animationDelay: c.delay }}>{body}</g>
        )
      })}
    </>
  )
}

function Birds({ reduced }: { reduced: boolean }) {
  return (
    <>
      {BIRDS.map((b) => {
        const body = (
          <g transform={`translate(${b.x} ${b.y}) scale(${b.scale})`}>
            <path d={BIRD_PATH} stroke="#2E3B24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </g>
        )
        return reduced ? (
          <g key={b.y} transform={`translate(${BIRD_STILL} 0)`}>{body}</g>
        ) : (
          <g key={b.y} className="ps-birdw" style={{ animationDuration: BIRD_DUR, animationDelay: b.delay }}>{body}</g>
        )
      })}
    </>
  )
}

/** Sky, dawn tint, sun at x 1240, clouds and birds of the wide scene. */
export function WideSky({ dawn, sunY, reduced }: WideSkyProps) {
  return (
    <>
      <rect width="1600" height="600" fill="url(#pwSky)" />
      <rect data-layer="dawn" className="ps-fade" width="1600" height="600" fill="url(#psDawn)" style={{ opacity: dawn }} />
      <g data-layer="sun" className="ps-sun" style={{ transform: `translate(1240px, ${sunY}px)` }}>
        <circle r="120" fill="url(#psGlow)" />
        <circle className={reduced ? undefined : 'ps-rays'} r="62" fill="none" stroke="#FFF1B8" strokeWidth="40" strokeDasharray="6 16" opacity=".35" />
        <circle r="32" fill="#FFF3C4" />
      </g>
      <Clouds reduced={reduced} />
      <Birds reduced={reduced} />
    </>
  )
}
