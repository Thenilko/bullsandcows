const BLOBS = [
  { cx: 300, cy: 560, rx: 380, ry: 120, dur: '16s', delay: undefined },
  { cx: 860, cy: 660, rx: 420, ry: 130, dur: '20s', delay: '-6s' },
  { cx: 1340, cy: 600, rx: 360, ry: 120, dur: '18s', delay: '-3s' },
  { cx: 700, cy: 460, rx: 500, ry: 90, dur: '22s', delay: '-9s' },
] as const

/** The wide blur's reach (stdDeviation 26), added to the radii as in FogLayer. */
const WIDE_FOG_SPREAD = 39

const PUFFS = [
  { cx: 1060, cy: 690, r: 40, delay: undefined },
  { cx: 1130, cy: 706, r: 34, delay: '.14s' },
  { cx: 1000, cy: 712, r: 30, delay: '.26s' },
] as const

/** Gradients that only the wide scene uses (the `pw` ids of the design); the fog gradient replaces the design's feGaussianBlur(26), see FogLayer. */
export function WideDefs() {
  return (
    <defs>
      <linearGradient id="pwSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5FA8DD" />
        <stop offset=".6" stopColor="#A9D6F0" />
        <stop offset="1" stopColor="#EAF4E8" />
      </linearGradient>
      <radialGradient id="pwFog">
        <stop offset="0" stopColor="#F4F8FA" />
        <stop offset=".55" stopColor="#F4F8FA" stopOpacity=".9" />
        <stop offset=".8" stopColor="#F4F8FA" stopOpacity=".45" />
        <stop offset="1" stopColor="#F4F8FA" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

/** Dust puffs on a miss, by the cows. */
export function WidePuffs() {
  return (
    <>
      {PUFFS.map((p) => (
        <circle key={p.cx} className="ps-puff" cx={p.cx} cy={p.cy} r={p.r} fill="url(#psDust)" style={p.delay ? { animationDelay: p.delay } : undefined} />
      ))}
    </>
  )
}

export function WideFog({ fog, reduced }: { fog: number; reduced: boolean }) {
  return (
    <g data-layer="fog" className="ps-fade" style={{ opacity: fog }}>
      <rect width="1600" height="900" fill="#EEF4F7" opacity=".5" />
      <g fill="url(#pwFog)">
        {BLOBS.map((b) => (
          <ellipse
            key={b.cx}
            className={reduced ? undefined : 'ps-fogb'}
            cx={b.cx}
            cy={b.cy}
            rx={b.rx + WIDE_FOG_SPREAD}
            ry={b.ry + WIDE_FOG_SPREAD}
            style={reduced ? undefined : { animationDuration: b.dur, animationDelay: b.delay }}
          />
        ))}
      </g>
    </g>
  )
}
