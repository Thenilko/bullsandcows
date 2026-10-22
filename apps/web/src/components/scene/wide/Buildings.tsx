import { BarnShapes } from '../Landscape'

/** Farmhouse with the chimney smoke (`ps-smoke`, three puffs with staggered delays in CSS). */
export function House({ reduced }: { reduced: boolean }) {
  return (
    <g transform="translate(70 560)">
      <path d="M0 0 L0 -54 L70 -54 L70 0Z" fill="#F1E4C8" />
      <path d="M70 0 L70 -54 L110 -54 L110 0Z" fill="#E2D0AA" />
      <path d="M-8 -50 L35 -86 L78 -50Z" fill="#B5452F" />
      <path d="M78 -50 L35 -86 L80 -88 L118 -52Z" fill="#9A3826" />
      <rect x="84" y="-104" width="10" height="24" fill="#8E7B66" />
      <rect x="14" y="-38" width="16" height="16" fill="#6FA3C8" stroke="#7A5230" strokeWidth="2.5" />
      <rect x="42" y="-38" width="16" height="38" fill="#7A5230" />
      <rect x="82" y="-38" width="16" height="16" fill="#6FA3C8" stroke="#7A5230" strokeWidth="2.5" />
      <g className={reduced ? undefined : 'ps-smoke'}>
        <circle cx="89" cy="-112" r="6" fill="#FFFFFF" opacity=".7" />
        <circle cx="96" cy="-124" r="8" fill="#FFFFFF" opacity=".5" />
        <circle cx="104" cy="-140" r="10" fill="#FFFFFF" opacity=".35" />
      </g>
    </g>
  )
}

export function Well() {
  return (
    <g transform="translate(230 566)">
      <path d="M-2 0 L-2 -70 L2 -70 L2 0Z" fill="#7A5230" />
      <path d="M0 -66 L60 -96" stroke="#7A5230" strokeWidth="4" strokeLinecap="round" />
      <path d="M0 -66 L-30 -50" stroke="#7A5230" strokeWidth="4" strokeLinecap="round" />
      <path d="M58 -95 L58 -40" stroke="#5E4129" strokeWidth="1.5" />
      <rect x="52" y="-42" width="12" height="10" rx="2" fill="#86592F" />
      <path d="M30 0 C30 -14 70 -14 70 0Z" fill="#A9A39A" />
      <rect x="30" y="-10" width="40" height="10" fill="#B9B3A9" />
      <path d="M30 -10 h40 M36 -10 v10 M48 -10 v10 M60 -10 v10" stroke="#8E877C" strokeWidth="1.4" />
    </g>
  )
}

interface PlacedProps {
  x: number
  y: number
  scale: number
}

export function Poplar({ x, y, scale }: PlacedProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-2 0 L0 -18 L2 0Z" fill="#5E4129" />
      <ellipse cx="0" cy="-30" rx="9" ry="22" fill="url(#psCanopy)" />
    </g>
  )
}

/** The big oak at the right edge. */
export function Oak() {
  return (
    <g transform="translate(1500 590) scale(2.0)">
      <path d="M-4 0 C-3 -14 -3 -28 -5 -40 L5 -40 C3 -28 3 -14 5 0Z" fill="#5E4129" />
      <circle cx="-16" cy="-52" r="20" fill="url(#psCanopy)" />
      <circle cx="8" cy="-64" r="24" fill="url(#psCanopy)" />
      <circle cx="22" cy="-46" r="18" fill="url(#psCanopy)" />
      <circle cx="0" cy="-40" r="16" fill="url(#psCanopy)" />
    </g>
  )
}

/** The mobile barn scaled ×2 at the pen, with a weathervane (`ps-vane`) on the ridge. */
export function Barn() {
  return (
    <g transform="translate(440 640) scale(2.0) translate(-15 -263)">
      <BarnShapes />
      <g className="ps-vane">
        <path d="M70 163 V150" stroke="#3E2A1F" strokeWidth="1.6" />
        <path d="M62 150 L78 150 L74 146 Z" fill="#3E2A1F" />
        <path d="M64 146 C66 140 72 140 74 144" fill="#3E2A1F" />
      </g>
    </g>
  )
}

export function HayBales() {
  return (
    <g transform="translate(700 612) scale(1.3)">
      <rect x="0" y="0" width="52" height="32" rx="10" fill="#E2B85A" />
      <path d="M8 8 H44 M8 16 H44 M8 24 H44" stroke="#C3943B" strokeWidth="2" />
      <rect x="20" y="-24" width="40" height="26" rx="8" fill="#EBC56B" />
      <path d="M26 -16 H54 M26 -8 H54" stroke="#C3943B" strokeWidth="2" />
    </g>
  )
}
