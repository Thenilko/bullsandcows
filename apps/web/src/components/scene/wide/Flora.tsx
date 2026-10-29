import { BushArt, Daisy, tuftPaths } from '../art/Plants'
import {
  BUSHES,
  FRONT_FLOWERS,
  FRONT_TUFTS,
  MEADOW_FLOWERS,
  MEADOW_TUFTS_A,
  MEADOW_TUFTS_B,
} from './wideFlora'

type Tuft = readonly [x: number, y: number, dx: number, dy: number, mid: number]
type Flower = readonly [cx: number, cy: number, fill: string]

interface TuftsProps {
  tufts: readonly Tuft[]
  /** Near tufts are a darker green. */
  near?: boolean
}

/** Filled five-blade tufts (art/Plants): one path of the dark blades and one of the light ones. */
function Tufts({ tufts, near = false }: TuftsProps) {
  const parts = tufts.map(([x, y, dx, dy, mid]) => tuftPaths(x, y, dx, dy, mid))
  return (
    <g>
      <path d={parts.map((t) => t.dark).join(' ')} fill={near ? '#2F6424' : '#3A7629'} />
      <path d={parts.map((t) => t.light).join(' ')} fill={near ? '#4A8F37' : '#5AA343'} />
    </g>
  )
}

function Flowers({ flowers, near = false }: { flowers: readonly Flower[]; near?: boolean }) {
  return (
    <g>
      {flowers.map(([cx, cy, fill], i) => (
        <Daisy key={i} cx={cx} cy={cy} fill={fill} s={near ? 1.5 : 1.15} outline={near} />
      ))}
    </g>
  )
}

/** Bushes along the far hill. */
export function Bushes() {
  return (
    <g>
      {BUSHES.map(([cx, cy, r], i) => (
        <BushArt key={i} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  )
}

/** Tufts and flowers of the meadow, between the scarecrow and the tally sign in paint order. */
export function MeadowFlora() {
  return (
    <>
      <Tufts tufts={MEADOW_TUFTS_A} />
      <Tufts tufts={MEADOW_TUFTS_B} />
      <Flowers flowers={MEADOW_FLOWERS} />
    </>
  )
}

/** Bigger tufts and flowers in front of the animals. */
export function FrontFlora() {
  return (
    <>
      <Tufts tufts={FRONT_TUFTS} near />
      <Flowers flowers={FRONT_FLOWERS} near />
    </>
  )
}
