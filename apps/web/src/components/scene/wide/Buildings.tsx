import { OakArt, PoplarArt } from '../art/Plants'
import { BarnShapes } from '../Landscape'

/** Farmhouse with the chimney smoke (`ps-smoke`, three puffs with staggered delays in CSS). */
export function House({ reduced }: { reduced: boolean }) {
  return (
    <g transform="translate(70 560)">
      <path
        d="M70 0 L70 -54 L110 -54 L110 0Z"
        fill="#E2D0AA"
        stroke="#2E3B24"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M0 0 L0 -54 L70 -54 L70 0Z"
        fill="#F1E4C8"
        stroke="#2E3B24"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M2 -8 H68 M72 -8 H108" stroke="#B9B2A0" strokeWidth="6" />
      <path d="M0 -11 H110 M0 0 H110" stroke="#2E3B24" strokeWidth="1.6" />
      <path
        d="M78 -50 L35 -86 L80 -88 L118 -52Z"
        fill="#9A3826"
        stroke="#2E3B24"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M62 -73 L97 -72 M50 -83 L88 -80 M72 -62 L107 -61"
        stroke="#7E2C1C"
        strokeWidth="1.6"
      />
      <rect
        x="84"
        y="-104"
        width="10"
        height="24"
        fill="#A3624A"
        stroke="#2E3B24"
        strokeWidth="2"
      />
      <path
        d="M84 -96 H94 M84 -88 H94 M89 -104 V-96 M87 -96 V-88 M91 -88 V-80"
        stroke="#7E4434"
        strokeWidth="1.1"
      />
      <rect
        x="81.6"
        y="-108"
        width="14.8"
        height="5"
        rx="1"
        fill="#6B5B4A"
        stroke="#2E3B24"
        strokeWidth="1.8"
      />
      <path
        d="M-8 -50 L35 -86 L78 -50Z"
        fill="#B5452F"
        stroke="#2E3B24"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M6.3 -62 H63.7 M20.7 -74 H49.3" stroke="#8E3424" strokeWidth="1.6" />
      <circle cx="35" cy="-66" r="4.6" fill="#6FA3C8" stroke="#2E3B24" strokeWidth="1.8" />
      <path d="M35 -70.6 V-61.4 M30.4 -66 H39.6" stroke="#F3EDE2" strokeWidth="1.2" />
      <rect
        x="14"
        y="-38"
        width="16"
        height="16"
        fill="#6FA3C8"
        stroke="#2E3B24"
        strokeWidth="2.2"
      />
      <path d="M22 -38 V-22 M14 -30 H30" stroke="#F3EDE2" strokeWidth="1.8" />
      <path d="M16 -36 L20 -36 L16 -28Z" fill="#DDEFF8" opacity=".8" />
      <rect
        x="11"
        y="-22.4"
        width="22"
        height="5"
        rx="1"
        fill="#86592F"
        stroke="#2E3B24"
        strokeWidth="1.4"
      />
      <g fill="#E85D75" stroke="#2E3B24" strokeWidth=".7">
        <circle cx="15" cy="-23.6" r="2" />
        <circle cx="22" cy="-24.2" r="2" />
        <circle cx="29" cy="-23.6" r="2" />
      </g>
      <rect
        x="42"
        y="-38"
        width="16"
        height="38"
        fill="#7A5230"
        stroke="#2E3B24"
        strokeWidth="2.2"
      />
      <path
        d="M45 -34 H55 V-22 H45Z M45 -18 H55 V-4 H45Z"
        fill="none"
        stroke="#5E3E22"
        strokeWidth="1.2"
      />
      <circle cx="54.6" cy="-19" r="1.5" fill="#F2C230" stroke="#2E3B24" strokeWidth=".6" />
      <rect
        x="38.6"
        y="-2"
        width="22.8"
        height="4"
        rx="1"
        fill="#9A948A"
        stroke="#2E3B24"
        strokeWidth="1.4"
      />
      <rect
        x="82"
        y="-38"
        width="16"
        height="16"
        fill="#6FA3C8"
        stroke="#2E3B24"
        strokeWidth="2.2"
      />
      <path d="M90 -38 V-22 M82 -30 H98" stroke="#F3EDE2" strokeWidth="1.8" />
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
      <ellipse cx="50" cy="1" rx="26" ry="3" fill="#2F5A22" opacity=".3" />
      <path
        d="M-3 0 L-3 -66 L3 -66 L3 0Z"
        fill="#7A5230"
        stroke="#2E3B24"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M-3 -66 L-7 -76 M3 -66 L7 -76"
        stroke="#2E3B24"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M-3 -66 L-7 -76 M3 -66 L7 -76"
        stroke="#7A5230"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M-30 -51 L60 -96" stroke="#2E3B24" strokeWidth="6" strokeLinecap="round" />
      <path d="M-30 -51 L60 -96" stroke="#86592F" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M-24 -55 L52 -93" stroke="#A8743F" strokeWidth="1" strokeLinecap="round" />
      <circle cx="0" cy="-66" r="2.2" fill="#2E3B24" />
      <ellipse
        cx="-31"
        cy="-47"
        rx="7"
        ry="5.6"
        fill="#9A948A"
        stroke="#2E3B24"
        strokeWidth="1.8"
      />
      <path
        d="M-34 -49 C-32 -51 -29 -51 -27 -49.6"
        stroke="#C9C3B6"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M58 -95 L58 -44" stroke="#2E3B24" strokeWidth="2.2" />
      <path d="M58 -95 L58 -44" stroke="#C9A36A" strokeWidth="1" />
      <path d="M52 -44 C52 -50 64 -50 64 -44" stroke="#2E3B24" strokeWidth="1.4" fill="none" />
      <path
        d="M51 -44 L65 -44 L63 -31 L53 -31Z"
        fill="#86592F"
        stroke="#2E3B24"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M51.6 -40 H64.4 M52.4 -35 H63.6" stroke="#5E4129" strokeWidth="1.2" />
      <path
        d="M30 0 L30 -12 C30 -16.6 70 -16.6 70 -12 L70 0Z"
        fill="#B9B3A9"
        stroke="#2E3B24"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse
        cx="50"
        cy="-12.4"
        rx="19"
        ry="3.6"
        fill="#4A4A42"
        stroke="#2E3B24"
        strokeWidth="1.6"
      />
      <path
        d="M31 -6 H69 M38 -11 V-6 M50 -10 V-6 M62 -11 V-6 M44 -6 V0 M56 -6 V0"
        stroke="#8E877C"
        strokeWidth="1.4"
      />
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
      <PoplarArt />
    </g>
  )
}

/** The big oak at the right edge. */
export function Oak() {
  return (
    <g transform="translate(1500 590) scale(2.0)">
      <OakArt />
    </g>
  )
}

/**
 * The mobile barn scaled ×2 at the pen, with a weathervane (`ps-vane`) on the ridge; `tint` is the player's barn
 * colour, `plainVane: false` leaves the ridge to the golden vane.
 */
export function Barn({
  tint = null,
  plainVane = true,
}: {
  tint?: string | null
  plainVane?: boolean
}) {
  return (
    <g transform="translate(440 640) scale(2.0) translate(-15 -263)">
      <BarnShapes tint={tint} />
      {plainVane ? (
        <g className="ps-vane">
          <path d="M70 163 V150" stroke="#2E3B24" strokeWidth="2.6" />
          <path d="M70 163 V150" stroke="#3E2A1F" strokeWidth="1.4" />
          <path
            d="M61 150 L76 150 L72.6 146.4 Z M76 150 L79 150"
            fill="#3E2A1F"
            stroke="#2E3B24"
            strokeWidth=".8"
            strokeLinejoin="round"
          />
          <path
            d="M64 146 C65.6 140 72 139.6 74 144 L73 146 C71 143 67 143.4 66 146Z"
            fill="#3E2A1F"
            stroke="#2E3B24"
            strokeWidth=".8"
          />
        </g>
      ) : null}
    </g>
  )
}

export function HayBales() {
  return (
    <g transform="translate(700 612) scale(1.3)">
      <ellipse cx="30" cy="32" rx="34" ry="4" fill="#2F5A22" opacity=".3" />
      <path
        d="M21.0 -14.9 l-2.8 -2.1 M59.0 -9.7 l2.8 -1.6 M32.0 -23.4 l-1.2 -3.1 M44.8 -23.4 l1.6 -2.6"
        stroke="#C9973A"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
      <rect
        x="20"
        y="-24"
        width="40"
        height="26"
        rx="6.2"
        fill="#E3B95C"
        stroke="#2E3B24"
        strokeWidth="1.5"
      />
      <rect x="21.8" y="-22.4" width="36.4" height="6.8" rx="3.4" fill="#F2D488" />
      <path
        d="M21.5 -3.7 H58.5 V-1.7 Q58.5 0.5 53.8 0.5 H26.2 Q21.5 0.5 21.5 -1.7Z"
        fill="#C9973A"
        opacity=".55"
      />
      <path
        d="M24.8 -12.3 l6.4 1.3 M28.0 -5.3 l4.8 -1.3 M36.8 -14.1 l5.6 1.3 M42.0 -6.8 l6.4 -1.3 M51.2 -11.0 l4.8 1.3 M54.4 -4.2 l4.0 -1.3 M33.6 -2.7 l4.0 1.3 M45.6 -16.2 l4.0 -1.3"
        stroke="#B88A2E"
        strokeWidth="0.90"
        strokeLinecap="round"
      />
      <path d="M30.8 -24 V2 M49.2 -24 V2" stroke="#2E3B24" strokeWidth="3.69" />
      <path d="M30.8 -24 V2 M49.2 -24 V2" stroke="#9C6B34" strokeWidth="2.34" />
      <path
        d="M1.0 11.2 l-3.6 -2.6 M51.0 17.6 l3.6 -1.9 M15.6 0.6 l-1.6 -3.8 M32.2 0.6 l2.1 -3.2"
        stroke="#C9973A"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
      <rect
        x="0"
        y="0"
        width="52"
        height="32"
        rx="7.7"
        fill="#E3B95C"
        stroke="#2E3B24"
        strokeWidth="1.5"
      />
      <rect x="1.8" y="1.7" width="48.4" height="8.3" rx="4.2" fill="#F2D488" />
      <path
        d="M1.5 25.0 H50.5 V27.4 Q50.5 30.5 44.3 30.5 H7.7 Q1.5 30.5 1.5 27.4Z"
        fill="#C9973A"
        opacity=".55"
      />
      <path
        d="M6.2 14.4 l8.3 1.6 M10.4 23.0 l6.2 -1.6 M21.8 12.2 l7.3 1.6 M28.6 21.1 l8.3 -1.6 M40.6 16.0 l6.2 1.6 M44.7 24.3 l5.2 -1.6 M17.7 26.2 l5.2 1.6 M33.3 9.6 l5.2 -1.6"
        stroke="#B88A2E"
        strokeWidth="0.90"
        strokeLinecap="round"
      />
      <path d="M14.0 0 V32 M38.0 0 V32" stroke="#2E3B24" strokeWidth="4.23" />
      <path d="M14.0 0 V32 M38.0 0 V32" stroke="#9C6B34" strokeWidth="2.88" />
    </g>
  )
}
