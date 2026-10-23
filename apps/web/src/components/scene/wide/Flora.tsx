import { BUSHES, FRONT_FLOWERS, FRONT_TUFTS, MEADOW_FLOWERS, MEADOW_TUFTS_A, MEADOW_TUFTS_B } from './wideFlora'

type Tuft = readonly [x: number, y: number, dx: number, dy: number, mid: number]
type Flower = readonly [cx: number, cy: number, fill: string]

/** Three blades from (x, y): left, middle (vertical) and right, as the design draws them. */
function tuftPath([x, y, dx, dy, mid]: Tuft): string {
  return `M${x} ${y} l${-dx} ${-dy} M${x + 3} ${y} v${-mid} M${x + 6} ${y} l${dx} ${-dy}`
}

interface TuftsProps {
  tufts: readonly Tuft[]
  stroke: string
  width: number
}

function Tufts({ tufts, stroke, width }: TuftsProps) {
  return (
    <g stroke={stroke} strokeWidth={width} strokeLinecap="round" fill="none">
      {tufts.map((t, i) => (
        <path key={i} d={tuftPath(t)} />
      ))}
    </g>
  )
}

function Flowers({ flowers }: { flowers: readonly Flower[] }) {
  return (
    <g>
      {flowers.map(([cx, cy, fill], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="3" fill={fill} />
          <circle cx={cx} cy={cy} r="1.1" fill="#F2C230" />
        </g>
      ))}
    </g>
  )
}

/** Bushes along the far hill. */
export function Bushes() {
  return (
    <g fill="#5A9747">
      {BUSHES.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  )
}

/** Tufts and flowers of the meadow, between the scarecrow and the tally sign in paint order. */
export function MeadowFlora() {
  return (
    <>
      <Tufts tufts={MEADOW_TUFTS_A} stroke="#3A7629" width={2} />
      <Tufts tufts={MEADOW_TUFTS_B} stroke="#3A7629" width={2} />
      <Flowers flowers={MEADOW_FLOWERS} />
    </>
  )
}

/** Bigger tufts and flowers in front of the animals. */
export function FrontFlora() {
  return (
    <>
      <Tufts tufts={FRONT_TUFTS} stroke="#346829" width={2.6} />
      <Flowers flowers={FRONT_FLOWERS} />
    </>
  )
}
