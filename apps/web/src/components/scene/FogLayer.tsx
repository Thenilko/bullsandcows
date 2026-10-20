const BLOBS = [
  { cx: 90, cy: 210, rx: 130, ry: 55, dur: '14s', delay: undefined },
  { cx: 290, cy: 290, rx: 140, ry: 60, dur: '18s', delay: '-6s' },
  { cx: 160, cy: 340, rx: 120, ry: 45, dur: '16s', delay: '-3s' },
] as const

export function FogLayer({ fog, reduced }: { fog: number; reduced: boolean }) {
  return (
    <g data-layer="fog" className="ps-fade" style={{ opacity: fog }}>
      <rect width="390" height="380" fill="#EEF4F7" opacity=".5" />
      <g filter="url(#psBlur)" fill="#F4F8FA">
        {BLOBS.map((b) => (
          <ellipse
            key={b.cx}
            className={reduced ? undefined : 'ps-fogb'}
            cx={b.cx}
            cy={b.cy}
            rx={b.rx}
            ry={b.ry}
            style={reduced ? undefined : { animationDuration: b.dur, animationDelay: b.delay }}
          />
        ))}
      </g>
    </g>
  )
}
