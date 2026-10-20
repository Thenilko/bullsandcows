interface SkyProps {
  dawn: number
  sunY: number
  reduced: boolean
}

const CLOUDS = [
  { dur: '38s', delay: '-6s', y: 56, opacity: '.95', still: 80, shapes: [[0, 0, 32, 10], [-8, -8, 15, 12], [12, -10, 16, 13]] },
  { dur: '52s', delay: '-30s', y: 106, opacity: '.8', still: 250, shapes: [[0, 0, 24, 8], [6, -7, 12, 10]] },
  { dur: '46s', delay: '-18s', y: 30, opacity: '.7', still: 170, shapes: [[0, 0, 26, 8], [-6, -6, 12, 9], [10, -7, 12, 10]] },
] as const

const BIRD_PATH = 'M1 6 Q5 1 9 5 Q13 1 17 6'

function Clouds({ reduced }: { reduced: boolean }) {
  return (
    <>
      {CLOUDS.map((c) => {
        const body = (
          <g transform={`translate(0 ${c.y})`} fill="#FFFFFF" opacity={c.opacity}>
            {c.shapes.map(([cx, cy, rx, ry]) => (
              <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} />
            ))}
          </g>
        )
        return reduced ? (
          <g key={c.y} transform={`translate(${c.still} 0)`}>{body}</g>
        ) : (
          <g key={c.y} className="ps-cloud" style={{ animationDuration: c.dur, animationDelay: c.delay }}>{body}</g>
        )
      })}
    </>
  )
}

function Birds({ reduced }: { reduced: boolean }) {
  const near = (
    <g transform="translate(0 92)">
      <path d={BIRD_PATH} stroke="#2E3B24" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  )
  const far = (
    <g transform="translate(6 110) scale(.7)">
      <path d={BIRD_PATH} stroke="#2E3B24" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  )
  if (reduced) {
    return (
      <>
        <g transform="translate(120 0)">{near}</g>
        <g transform="translate(300 0)">{far}</g>
      </>
    )
  }
  return (
    <>
      <g className="ps-bird" style={{ animationDuration: '18s' }}>{near}</g>
      <g className="ps-bird" style={{ animationDuration: '18s', animationDelay: '-.6s' }}>{far}</g>
    </>
  )
}

export function Sky({ dawn, sunY, reduced }: SkyProps) {
  return (
    <>
      <rect width="390" height="272" fill="url(#psSky)" />
      <rect data-layer="dawn" className="ps-fade" width="390" height="272" fill="url(#psDawn)" style={{ opacity: dawn }} />
      <g data-layer="sun" className="ps-sun" style={{ transform: `translate(322px, ${sunY}px)` }}>
        <circle r="60" fill="url(#psGlow)" />
        <circle className={reduced ? undefined : 'ps-rays'} r="34" fill="none" stroke="#FFF1B8" strokeWidth="22" strokeDasharray="4 10" opacity=".35" />
        <circle r="17" fill="#FFF3C4" />
      </g>
      <Clouds reduced={reduced} />
      <Birds reduced={reduced} />
    </>
  )
}
