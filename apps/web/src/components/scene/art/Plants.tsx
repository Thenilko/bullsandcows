/**
 * Trees, bushes, grass and flowers in the style of the animals: a dark #2E3B24 outline where the plant is near,
 * a darker shade and a lit side. Each is drawn around its own origin (the foot of a tree, the base of a tuft).
 */

const INK = '#2E3B24'

/** Canopy lobes of the oak: cx, cy, r. The outline is the same circles drawn larger in ink underneath. */
const OAK_LOBES = [
  [-18, -52, 19],
  [6, -66, 23],
  [24, -48, 18],
  [0, -42, 17],
  [-6, -60, 18],
  [16, -62, 16],
] as const
const OAK_SHADE = [
  [-14, -45, 12],
  [12, -42, 12],
  [27, -45, 11],
] as const
/** The lit top-left of each lobe except the low middle one, and three brighter spots. */
const OAK_LIT = OAK_LOBES.filter((_, i) => i !== 3).map(
  ([x, y, r]) => [x - r * 0.22, y - r * 0.26, r * 0.7] as const,
)
const OAK_SHINE = [OAK_LOBES[1], OAK_LOBES[4], OAK_LOBES[0]].map(
  ([x, y, r]) => [x - r * 0.35, y - r * 0.42, r * 0.36] as const,
)

/** The big oak, standing on the origin (canopy up to about y -90). */
export function OakArt() {
  return (
    <g>
      <ellipse cx="2" cy="1" rx="30" ry="4" fill="#1E2A14" opacity=".18" />
      <path
        d="M-6 0 C-4 -12 -4 -26 -7 -38 L-2 -36 L0 -44 L3 -36 L8 -40 C4 -28 4 -14 6 0 Z"
        fill="#6B4A2E"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M-1 -4 C-2 -12 -1 -20 -3 -28 M3 -10 C3 -16 4 -20 3 -24"
        stroke="#4E321A"
        strokeWidth=".9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M-9 .4 C-6 -1.4 -5.6 -3 -5 -6 M9 .4 C6 -1.4 5.8 -3 5 -6"
        stroke={INK}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      {OAK_LOBES.map(([x, y, r]) => (
        <circle key={`o${x}`} cx={x} cy={y} r={r + 1.5} fill={INK} />
      ))}
      {OAK_LOBES.map(([x, y, r]) => (
        <circle key={`f${x}`} cx={x} cy={y} r={r} fill="#5E9E46" />
      ))}
      {OAK_SHADE.map(([x, y, r]) => (
        <circle key={`s${x}`} cx={x} cy={y} r={r} fill="#4A8636" />
      ))}
      {OAK_LIT.map(([x, y, r]) => (
        <circle key={`l${x}`} cx={x} cy={y} r={r} fill="#72B353" />
      ))}
      {OAK_SHINE.map(([x, y, r]) => (
        <circle key={`h${x}`} cx={x} cy={y} r={r} fill="#8CCB66" />
      ))}
      <path
        d="M-24 -46 c3 2 6 2 8 0 M4 -50 c3 2 6 2 8 0 M18 -40 c3 2 6 2 8 0 M-8 -38 c3 2 6 2 8 0"
        stroke="#3F7330"
        strokeWidth="1.1"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

/** A poplar standing on the origin, about 54 tall, shaded on the right. */
export function PoplarArt() {
  return (
    <g>
      <rect x="-1.8" y="-9" width="3.6" height="9" fill="#6B4A2E" stroke={INK} strokeWidth="1" />
      <path
        d="M0 -54 C7 -44 10 -26 8 -13 C6 -7 -6 -7 -8 -13 C-10 -26 -7 -44 0 -54Z"
        fill="#5E9E46"
        stroke={INK}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M0 -54 C7 -44 10 -26 8 -13 C6 -8.4 3.4 -7.4 1 -7.2 C4.4 -20 4 -40 0 -54Z"
        fill="#4A8636"
      />
      <path
        d="M-4.4 -38 C-5.4 -30 -5.4 -22 -4.4 -15"
        stroke="#86C462"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M2 -30 c2 1.4 4 1.4 5 0 M-6 -24 c2 1.4 4 1.4 5 0 M1 -18 c2 1.4 4 1.4 5 0"
        stroke="#3F7330"
        strokeWidth=".9"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

/** A far bush: the clump with a thin darker edge and its lit top-left. */
export function BushArt({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#4F8F3E" stroke="#3A6E2C" strokeWidth=".9" />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.35} r={r * 0.55} fill="#6FAE52" />
    </>
  )
}

const r1 = (n: number) => Math.round(n * 10) / 10

/**
 * A grass tuft from its base (x, y): five filled, tapered blades fanning out, dark outside and light inside.
 * `dx`/`dy` reach the outer tips, `mid` the middle one (the same numbers the old three-stroke tufts used).
 */
export function tuftPaths(
  x: number,
  y: number,
  dx: number,
  dy: number,
  mid: number,
): { dark: string; light: string } {
  const w = Math.max(2.2, dx * 0.7)
  const blade = (bx: number, tx: number, ty: number, bend: number) =>
    `M${r1(bx - w / 2)} ${y} Q${r1(bx + bend - w * 0.1)} ${r1((y + ty) / 2)} ${r1(tx)} ${r1(ty)} ` +
    `Q${r1(bx + bend + w * 0.3)} ${r1((y + ty) / 2)} ${r1(bx + w / 2)} ${y}Z`
  const c = x + 3
  return {
    dark:
      blade(c - 2, x - dx * 1.1, y - dy, -dx * 0.2) +
      blade(c + 2, x + 6 + dx * 1.1, y - dy, dx * 0.2) +
      blade(c, c + 0.4, y - mid * 1.1, 0),
    light:
      blade(c - 1, x - dx * 0.3, y - mid * 0.95, -1) +
      blade(c + 1, x + 6 + dx * 0.3, y - mid * 0.9, 1),
  }
}

const DAISY_ANGLES = [-90, -18, 54, 126, 198] as const

/** A five-petal flower; `outline` for the near ones, `s` scales it (1 is about 7 across). */
export function Daisy({
  cx,
  cy,
  fill,
  s = 1,
  outline = false,
}: {
  cx: number
  cy: number
  fill: string
  s?: number
  outline?: boolean
}) {
  const line = outline ? { stroke: INK, strokeWidth: r1(0.45 * s * 100) / 100 } : {}
  return (
    <g>
      {DAISY_ANGLES.map((a) => (
        <circle
          key={a}
          cx={r1((cx + Math.cos((a * Math.PI) / 180) * 2.1 * s) * 10) / 10}
          cy={r1((cy + Math.sin((a * Math.PI) / 180) * 2.1 * s) * 10) / 10}
          r={1.45 * s}
          fill={fill}
          {...line}
        />
      ))}
      <circle cx={cx} cy={cy} r={1.25 * s} fill="#F2C230" {...line} />
    </g>
  )
}
