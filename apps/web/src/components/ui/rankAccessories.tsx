import type { RankKey } from '@bc/protocol'
import type { ReactNode } from 'react'

/**
 * Accessories of the design board „Персонажи по ниво“, drawn in the head's coordinate
 * space. `back` goes behind the head (bell straps, scarves), `front` on top of it (hats,
 * wreaths, crowns). Each group carries `data-accessory` so tests and tools can see it.
 */
export interface RankAccessory {
  readonly back?: ReactNode
  readonly front?: ReactNode
}

const STRAP = 'M-30 30 C-14 44 14 44 30 30'

interface BellProps {
  strap: string
  body: string
  clapper: string
}

function Bell({ strap, body, clapper }: BellProps) {
  return (
    <g data-accessory="bell">
      <path d={STRAP} fill="none" stroke="#2E3B24" strokeWidth="9" strokeLinecap="round" />
      <path d={STRAP} fill="none" stroke={strap} strokeWidth="5.5" strokeLinecap="round" />
      <g stroke="#2E3B24" strokeWidth="2.6" strokeLinejoin="round">
        <path d="M-10 44 C-10 36 10 36 10 44 L13 58 L-13 58 Z" fill={body} />
        <circle cx="0" cy="60" r="3.4" fill={clapper} />
      </g>
      <path d="M-5 44 L-6 54" stroke="#FFF3C4" strokeWidth="2" strokeLinecap="round" opacity=".8" />
    </g>
  )
}

const SCARF_DOTS = [
  [-14, 40],
  [0, 44],
  [14, 40],
  [-6, 51],
  [7, 51],
] as const

function Scarf() {
  return (
    <g data-accessory="scarf">
      <path
        d="M-31 26 C-14 38 14 38 31 26 L22 40 L0 60 L-22 40 Z"
        fill="#B5452F"
        stroke="#2E3B24"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <g fill="#FFF3D6">
        {SCARF_DOTS.map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r="2" />
        ))}
      </g>
      <path d="M22 32 L34 44 L28 46 Z" fill="#9A3826" stroke="#2E3B24" strokeWidth="2.4" strokeLinejoin="round" />
    </g>
  )
}

const PETAL_ANGLES = [0, 60, 120, 180, 240, 300] as const

function Daisy({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {PETAL_ANGLES.map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy="-4.2"
          rx="2.4"
          ry="4"
          fill="#FFFFFF"
          stroke="#2E3B24"
          strokeWidth="1.2"
          transform={`rotate(${a})`}
        />
      ))}
      <circle r="2.4" fill="#F2C230" stroke="#2E3B24" strokeWidth="1" />
    </g>
  )
}

function Poppy({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="6.5" fill="#D63A2F" stroke="#2E3B24" strokeWidth="2" />
      <circle r="2.2" fill="#2E1E16" />
    </g>
  )
}

function Sunflower({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="5.5" fill="#F2C230" stroke="#2E3B24" strokeWidth="2" />
      <circle r="2" fill="#C98A1A" />
    </g>
  )
}

const WREATH = 'M-36 -32 C-20 -50 20 -50 36 -32'

function Wreath() {
  return (
    <g data-accessory="wreath">
      <path d={WREATH} fill="none" stroke="#2E3B24" strokeWidth="7" strokeLinecap="round" />
      <path d={WREATH} fill="none" stroke="#5E9E46" strokeWidth="4" strokeLinecap="round" />
      <Daisy x={-30} y={-38} />
      <Poppy x={-18} y={-45} />
      <Daisy x={-6} y={-48} />
      <Sunflower x={6} y={-48} />
      <Poppy x={18} y={-45} />
      <Daisy x={30} y={-38} />
    </g>
  )
}

function FurHat() {
  return (
    <g data-accessory="hat">
      <path d="M-24 -38 C-26 -56 -20 -72 -4 -76 C14 -78 24 -66 24 -38 C10 -33 -10 -33 -24 -38 Z" fill="#2A2522" />
      <path
        d="M-18 -46 q3 -3 6 0 q3 -3 6 0 M-2 -56 q3 -3 6 0 q3 -3 6 0 M-16 -62 q3 -3 6 0 M8 -68 q3 -3 6 0 M6 -44 q3 -3 6 0 q3 -3 6 0"
        fill="none"
        stroke="#5A524C"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M-24 -38 C-10 -33 10 -33 24 -38" fill="none" stroke="#5A524C" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 -40 C16 -48 22 -50 26 -48" fill="none" stroke="#5E9E46" strokeWidth="3" strokeLinecap="round" />
      <circle cx="26" cy="-48" r="3.5" fill="#D63A2F" stroke="#2E3B24" strokeWidth="1.5" />
    </g>
  )
}

function Crown() {
  return (
    <g data-accessory="crown">
      <path d="M-24 -38 L-28 -66 L-14 -52 L0 -72 L14 -52 L28 -66 L24 -38 C10 -33 -10 -33 -24 -38 Z" fill="#F2C230" />
      <path d="M-23 -44 C-8 -40 8 -40 23 -44" fill="none" stroke="#C98A1A" strokeWidth="3" />
      <circle cx="0" cy="-48" r="4.5" fill="#D63A2F" stroke="#2E3B24" strokeWidth="1.8" />
      <circle cx="-14" cy="-46" r="3" fill="#4A7FB0" stroke="#2E3B24" strokeWidth="1.5" />
      <circle cx="14" cy="-46" r="3" fill="#5E9E46" stroke="#2E3B24" strokeWidth="1.5" />
      <g fill="#F2C230" stroke="#2E3B24" strokeWidth="1.8">
        <circle cx="-28" cy="-67" r="3.4" />
        <circle cx="0" cy="-73" r="3.6" />
        <circle cx="28" cy="-67" r="3.4" />
      </g>
      <path
        d="M-18 -60 L-16 -56 M30 -76 l3 -3 M-34 -74 l-3 -3 M36 -66 l4 0"
        stroke="#FFF3C4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  )
}

const COPPER_BELL = <Bell strap="#B5452F" body="#D9A441" clapper="#9C6B1E" />
const GOLDEN_BELL = <Bell strap="#8E5BA8" body="#F2C230" clapper="#B8860B" />

/** Теленце — nothing; Говедар — copper bell; Овчар — dotted scarf; Пастир — wreath + bell;
 * Стопанин — fur hat + scarf; Главен бик — crown + golden bell. */
export const RANK_ACCESSORY: Readonly<Record<RankKey, RankAccessory>> = {
  calf: {},
  herdsman: { back: COPPER_BELL },
  shepherd: { back: <Scarf /> },
  pastor: { back: COPPER_BELL, front: <Wreath /> },
  steward: { back: <Scarf />, front: <FurHat /> },
  chiefBull: { back: GOLDEN_BELL, front: <Crown /> },
}
