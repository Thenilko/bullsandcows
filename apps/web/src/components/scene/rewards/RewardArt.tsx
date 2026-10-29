/**
 * The pasture rewards as drawn in PasExtras.dc.html, each around its own origin; the scenes and the list place
 * and scale them. The loops (`pw-*` in pasishte.css) pause with the scene's idle freeze and under reduced motion.
 */

const INK = '#2E3B24'
const PETALS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const

/** Кученце Шаро, sitting, in the style of the bull and the cow; the tail wags. Feet at y 22. */
export function Dog() {
  return (
    <g className="pw-dog">
      <ellipse cx="3" cy="22.5" rx="17" ry="3" fill="#1E2A14" opacity=".2" />
      <g className="pw-tailwag">
        <path
          d="M12 15 C19 13 23 7 22 0 C21.6 -2 19 -2 18.8 .4 C18.6 5 15.6 9.6 10.6 11 Z"
          fill="#C48E55"
          stroke={INK}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M22 0 C21.6 -2 19 -2 18.8 .4 C18.8 1.8 19 2.6 19.6 3 C20.8 2.4 21.8 1.4 22 0Z"
          fill="#FFF3DD"
        />
      </g>
      <path
        d="M-9 -2 C-12.5 8 -11.5 18 -7.5 22.5 L15 22.5 C19.5 18 19.5 7 13 -.5 C8.5 -5.5 -5 -6.5 -9 -2 Z"
        fill="#C48E55"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5 22.5 C3 15 7 8.5 13.5 9 C18 10 19 16 17.5 22.5 Z"
        fill="#B27A44"
        stroke={INK}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M-7.6 -.5 C-9.6 8 -7.8 16 -4.6 22 L2.6 22 C.8 15 .2 6 -.8 -.6 Z" fill="#FFF3DD" />
      <rect
        x="-8.2"
        y="8"
        width="5.6"
        height="14.4"
        rx="2.8"
        fill="#C48E55"
        stroke={INK}
        strokeWidth="1.2"
      />
      <rect
        x="-1.4"
        y="8.6"
        width="5.6"
        height="13.8"
        rx="2.8"
        fill="#C48E55"
        stroke={INK}
        strokeWidth="1.2"
      />
      <ellipse cx="-5.4" cy="21.6" rx="3.8" ry="2" fill="#FFF3DD" stroke={INK} strokeWidth="1.1" />
      <ellipse cx="1.4" cy="21.6" rx="3.8" ry="2" fill="#FFF3DD" stroke={INK} strokeWidth="1.1" />
      <path
        d="M-10.5 -4.2 C-5 -.6 3.5 -.8 8.5 -5"
        stroke={INK}
        strokeWidth="4.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M-10.5 -4.2 C-5 -.6 3.5 -.8 8.5 -5"
        stroke="#D2483A"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="-1.6" cy="-.2" r="2" fill="#F2C230" stroke={INK} strokeWidth=".8" />
      <path
        d="M-14 -14.5 C-14 -22.5 -8 -26.5 -1 -26.5 C6 -26.5 11 -21.5 11 -14.5 C11 -7.5 6 -3.5 -1 -3.5 C-8 -3.5 -14 -7.5 -14 -14.5Z"
        fill="#C48E55"
        stroke={INK}
        strokeWidth="1.4"
      />
      <ellipse cx="3.6" cy="-17" rx="5" ry="4.6" fill="#A06A3A" />
      <path
        d="M-11.5 -21.5 C-19.5 -23 -22 -12 -17.4 -4.6 C-14 -5.4 -12 -10 -11 -15.6 Z"
        fill="#7A5230"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M7.4 -23 C14.4 -24.4 17 -14.6 13.6 -7.8 C10.4 -8.6 8.8 -13.6 8 -18.4 Z"
        fill="#7A5230"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <ellipse cx="-12.2" cy="-11" rx="1.8" ry="1.1" fill="#F29BB8" opacity=".7" />
      <ellipse cx="-4.4" cy="-9.4" rx="6.8" ry="5" fill="#FFF3DD" stroke={INK} strokeWidth="1.1" />
      <path
        d="M-4.6 -9.8 V-8 M-8.6 -7.6 C-7.2 -6 -5.4 -6.4 -4.6 -8 C-3.8 -6.4 -2 -6 -.6 -7.6"
        stroke={INK}
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M-6 -6.9 C-6 -3.8 -3.2 -3.8 -3.2 -6.9 Z"
        fill="#E86A6A"
        stroke={INK}
        strokeWidth=".8"
        strokeLinejoin="round"
      />
      <ellipse cx="-4.8" cy="-11.6" rx="2.8" ry="2.1" fill={INK} />
      <circle cx="-5.7" cy="-12.3" r=".7" fill="#FFFFFF" />
      <ellipse
        cx="-8.4"
        cy="-17.2"
        rx="2.5"
        ry="2.8"
        fill="#FFFFFF"
        stroke={INK}
        strokeWidth=".9"
      />
      <circle cx="-8.80" cy="-16.70" r="1.55" fill={INK} />
      <circle cx="-9.50" cy="-17.54" r="0.60" fill="#FFFFFF" />
      <ellipse cx="1.8" cy="-17.6" rx="2.5" ry="2.8" fill="#FFFFFF" stroke={INK} strokeWidth=".9" />
      <circle cx="1.40" cy="-17.10" r="1.55" fill={INK} />
      <circle cx="0.70" cy="-17.94" r="0.60" fill="#FFFFFF" />
      <path
        d="M-11 -21.2 L-7 -21.8 M.2 -22 L4 -21.2"
        stroke={INK}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </g>
  )
}

/** One sunflower: the head at the origin nods (two rings of petals), the stem goes down to y 34. */
export function Sunflower() {
  return (
    <g>
      <path
        d="M0 3 C1.6 12 -1 22 .6 34"
        stroke={INK}
        strokeWidth="4.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M0 3 C1.6 12 -1 22 .6 34"
        stroke="#5E9E46"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M.4 16 C-4 10 -13 10 -15.4 15 C-11.4 20.4 -4 20.4 .4 16Z"
        fill="#6DAE4F"
        stroke={INK}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M-.6 16 C-5 14.6 -9.4 14.6 -13.4 15.2"
        stroke="#3F7F2E"
        strokeWidth=".8"
        fill="none"
      />
      <path
        d="M.6 23.4 C5 17.4 14 17.4 16.4 22.6 C12.4 27.6 5 27.6 .6 23.4Z"
        fill="#5E9E46"
        stroke={INK}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M1.6 23.4 C6 22 10.4 22 14.4 22.8" stroke="#3F7F2E" strokeWidth=".8" fill="none" />
      <g className="pw-nod">
        {PETALS.map((deg) => (
          <ellipse
            key={`b${deg}`}
            cx="0"
            cy="-8.4"
            rx="2.8"
            ry="5.4"
            fill="#E39A24"
            stroke={INK}
            strokeWidth=".8"
            transform={`rotate(${deg + 15})`}
          />
        ))}
        {PETALS.map((deg) => (
          <ellipse
            key={deg}
            cx="0"
            cy="-7.6"
            rx="2.6"
            ry="5"
            fill="#F7C83A"
            stroke={INK}
            strokeWidth=".8"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r="6.2" fill="#6B4423" stroke={INK} strokeWidth="1.2" />
        <circle r="4.3" fill="#8A5A2E" />
        <circle cx="-2" cy="-1.4" r=".55" fill="#4A2E16" />
        <circle cx="0" cy="-2.6" r=".55" fill="#4A2E16" />
        <circle cx="2" cy="-1.2" r=".55" fill="#4A2E16" />
        <circle cx="-1" cy="1" r=".55" fill="#4A2E16" />
        <circle cx="1.2" cy="1.4" r=".55" fill="#4A2E16" />
        <circle cx="-2.6" cy="1.2" r=".55" fill="#4A2E16" />
        <circle cx="2.6" cy="1" r=".55" fill="#4A2E16" />
        <circle cx="0" cy="0.2" r=".55" fill="#4A2E16" />
        <path
          d="M-3.6 -3 A4.6 4.6 0 0 1 1.4 -4.4"
          stroke="#B07A44"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </g>
  )
}

/** One striped bee with white wings; the inner group buzzes (`pw-bee`). */
function Bee({
  x,
  y,
  scale = 1,
  flip = false,
}: {
  x: number
  y: number
  scale?: number
  flip?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <g className="pw-bee">
        <ellipse
          cx="-.6"
          cy="-2.2"
          rx="1.6"
          ry="2.2"
          fill="#FFFFFF"
          opacity=".9"
          stroke={INK}
          strokeWidth=".5"
          transform="rotate(-20 -.6 -2.2)"
        />
        <ellipse
          cx="1.2"
          cy="-2.2"
          rx="1.4"
          ry="2"
          fill="#FFFFFF"
          opacity=".9"
          stroke={INK}
          strokeWidth=".5"
          transform="rotate(20 1.2 -2.2)"
        />
        <ellipse cx="0" cy="0" rx="2.6" ry="1.8" fill="#F2C230" stroke={INK} strokeWidth=".7" />
        <path d="M-.4 -1.7 V1.7 M1.2 -1.5 V1.5" stroke={INK} strokeWidth=".8" />
        <circle cx="-1.6" cy="-.3" r=".45" fill={INK} />
      </g>
    </g>
  )
}

/** The straw skep on its stand with three striped bees. Post down to y 20. */
export function Beehive() {
  return (
    <g>
      <rect x="-2.6" y="7" width="5.2" height="13" fill="#86592F" stroke={INK} strokeWidth="1.2" />
      <rect
        x="-16"
        y="4.4"
        width="32"
        height="4"
        rx="1.6"
        fill="#A8743F"
        stroke={INK}
        strokeWidth="1.2"
      />
      <path
        d="M-14 5 C-15 -8 -8 -17 0 -17 C8 -17 15 -8 14 5 Z"
        fill="#E8BE5E"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 -15.4 C11.6 -11.4 15 -4.4 14 5 L8.8 5 C10 -3 9.4 -10 5.5 -15.4Z"
        fill="#D4A443"
        opacity=".75"
      />
      <path
        d="M-14.5 -1 C-6 1.6 6 1.6 14.5 -1 M-12.8 -7 C-5 -5 5 -5 12.8 -7 M-8.8 -12.6 C-3 -11 3 -11 8.8 -12.6"
        stroke="#B0832A"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M-10 -9.6 C-11 -6 -11.4 -3 -11.2 .4"
        stroke="#F6DA8E"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="0" cy="-17" rx="2.6" ry="1.5" fill="#D4A443" stroke={INK} strokeWidth="1" />
      <path d="M-3.8 5 C-3.8 -.4 3.8 -.4 3.8 5Z" fill="#3A2418" stroke={INK} strokeWidth="1" />
      <g className="pw-bees">
        <Bee x={18} y={-10} scale={1.0} />
        <Bee x={-17} y={-15} scale={0.9} flip />
        <Bee x={7} y={-25} scale={0.85} />
      </g>
    </g>
  )
}

/** The rooster with a green sickle tail, standing with its feet at about y 6. */
export function Rooster() {
  return (
    <g transform="translate(0 -8)">
      <path
        d="M6 -5 C9 -18 20 -21 23 -13 C19 -14.6 14.4 -11 12.4 -4Z"
        fill="#2F5A3A"
        stroke={INK}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M7 -2.4 C14 -10 22.6 -8 22.4 .4 C18.6 -3.6 14.6 -1.8 11.4 1.4Z"
        fill="#3F7F55"
        stroke={INK}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M6.4 1 C12.4 -.6 18.4 3 17.4 8 C14.4 4.8 10.4 5 8 5Z"
        fill={INK}
        stroke={INK}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M-1 7 V13.6 M3.4 7 V13.6" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M-1 7 V13.6 M3.4 7 V13.6" stroke="#F2A13A" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M-3.6 14 H1 M.8 14 H5.6" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M-8.4 -4.4 C-10.6 4 -4.4 9.4 4 8.4 C10.4 7.6 12.4 1.4 9.4 -5 C6.4 -10 -4.4 -10 -8.4 -4.4Z"
        fill="#E0763E"
        stroke={INK}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M-6 3 C-2 7.4 4 7.6 8.4 4.4 C6.4 7.6 0 9 -4.4 6.4Z" fill="#B5452F" opacity=".6" />
      <path
        d="M-2 -2 C2 -4.4 8.4 -2.4 8.4 1.8 C6.4 5 .4 5 -2 2Z"
        fill="#B5452F"
        stroke={INK}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M0 0 C2.6 -.8 5 -.2 6.4 1.4" stroke="#7E2A1C" strokeWidth=".8" fill="none" />
      <path
        d="M-11 -9 C-12 -3.4 -9.4 .4 -5.4 -.4 L-1.4 -6.4 C-3 -10 -7.4 -12 -11 -9Z"
        fill="#F2A13A"
        stroke={INK}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="-7.4" cy="-11.4" r="4.6" fill="#F2A13A" stroke={INK} strokeWidth="1.2" />
      <path
        d="M-10.4 -14.8 C-11.6 -18.6 -8.8 -19.6 -8.2 -16.8 C-8.2 -20 -4.8 -20.6 -4.8 -17.2 C-3.8 -19.8 -1.2 -18.8 -2.6 -14.8 Z"
        fill="#D63A2F"
        stroke={INK}
        strokeWidth=".9"
        strokeLinejoin="round"
      />
      <path
        d="M-11.6 -12.2 L-15.6 -11 L-11.4 -9.8Z"
        fill="#F2C230"
        stroke={INK}
        strokeWidth=".8"
        strokeLinejoin="round"
      />
      <path
        d="M-11.2 -9.8 C-12.8 -7 -10.8 -5.8 -9.8 -8.8Z"
        fill="#D63A2F"
        stroke={INK}
        strokeWidth=".7"
      />
      <ellipse
        cx="-8.6"
        cy="-12.4"
        rx="1.5"
        ry="1.6"
        fill="#FFFFFF"
        stroke={INK}
        strokeWidth=".9"
      />
      <circle cx="-8.90" cy="-12.20" r="0.93" fill={INK} />
      <circle cx="-9.32" cy="-12.68" r="0.36" fill="#FFFFFF" />
    </g>
  )
}

/** The windmill: the tower stands on the origin, the sails turn at y -42. */
export function Windmill() {
  return (
    <g>
      <path d="M-7 0 L-4 -40 L4 -40 L7 0Z" fill="#F1E4C8" stroke={INK} strokeWidth="1.4" />
      <path d="M-6 -40 L0 -48 L6 -40Z" fill="#B5452F" stroke={INK} strokeWidth="1.2" />
      <rect x="-2" y="-12" width="4" height="12" fill="#7A5230" />
      <g transform="translate(0 -42)">
        <g className="pw-sails">
          <path
            d="M0 0 L-2 -24 L4 -24Z M0 0 L24 -2 L24 4Z M0 0 L2 24 L-4 24Z M0 0 L-24 2 L-24 -4Z"
            fill="#FFFDF6"
            stroke={INK}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <circle r="2.2" fill={INK} />
        </g>
      </g>
    </g>
  )
}

/** The second, smaller barn; its left corner stands on the origin. */
export function Shed() {
  return (
    <g>
      <path d="M0 0 L0 -18 L14 -28 L28 -18 L28 0Z" fill="#C9563D" stroke={INK} strokeWidth="1.3" />
      <path
        d="M-3 -16 L14 -30 L31 -16"
        stroke="#3E2A1F"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x="9"
        y="-12"
        width="10"
        height="12"
        fill="#8E3424"
        stroke="#F3EDE2"
        strokeWidth="1.2"
      />
    </g>
  )
}

/** The golden weathervane (a rooster on a rod), its rod's foot at y 12. */
export function GoldenVane() {
  return (
    <g className="pw-vane">
      <path d="M0 12 V-4" stroke="#B8860B" strokeWidth="1.6" />
      <path
        d="M-8 -4 C-8 -10 -2 -14 2 -12 C6 -10 4 -6 8 -6 C10 -10 14 -8 12 -4Z"
        fill="#F2C230"
        stroke="#8C6420"
        strokeWidth=".9"
      />
      <circle cx="0" cy="-4" r="1.2" fill="#B8860B" />
    </g>
  )
}

/** The pond with stones, lily pads, cattails and two bobbing ducks (white and mallard), centred on the origin. */
export function Pond() {
  return (
    <g>
      <ellipse cx="0" cy="1" rx="58" ry="16.5" fill="#5E8F3E" opacity=".5" />
      <ellipse rx="56" ry="15" fill="#6FA3C8" stroke={INK} strokeWidth="1.6" />
      <ellipse cx="-4" cy="-3" rx="44" ry="9" fill="#86B7D8" />
      <path
        d="M-36 -3 C-24 -6 -12 -6 -2 -4 M14 5 C24 3 32 3 40 5"
        stroke="#D6EEF8"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <g fill="#B9B2A0" stroke={INK} strokeWidth=".9">
        <ellipse cx="-50" cy="8" rx="5" ry="3" />
        <ellipse cx="-42" cy="12.6" rx="4" ry="2.4" />
        <ellipse cx="44" cy="11.4" rx="5" ry="3" />
        <ellipse cx="53" cy="6" rx="3.6" ry="2.4" />
        <ellipse cx="-6" cy="15" rx="4" ry="2.2" />
      </g>
      <path d="M30 -4 a6 3 0 1 0 6 2.4 L32 -3 Z" fill="#6DAE4F" stroke={INK} strokeWidth=".9" />
      <path d="M-40 4 a5 2.6 0 1 0 5 2 L-37 4.6 Z" fill="#5E9E46" stroke={INK} strokeWidth=".9" />
      <g transform="translate(34 -3)">
        <path
          d="M0 0 C-2 -3 -1 -4 0 -2.4 C1 -4 2 -3 0 0Z"
          fill="#F29BB8"
          stroke={INK}
          strokeWidth=".6"
        />
      </g>
      <g transform="translate(-12 0)">
        <g className="pw-duck">
          <ellipse cx="0" cy="1" rx="10" ry="1.8" fill="#BFE0F2" opacity=".8" />
          <path
            d="M-8 -1 C-8 -5 -3 -6.4 2 -5.4 C5 -4.8 7 -6.8 8.2 -8.4 C8.8 -4.4 7.4 -.2 3 .4 L-6 .4 C-7.4 .2 -8 -.2 -8 -1Z"
            fill="#FFFDF6"
            stroke={INK}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M-2 -3.4 C1 -4.6 4.4 -3.6 4.8 -1.4 C2 -.6 -1 -.8 -2 -3.4Z"
            fill="#E8E0CC"
            stroke={INK}
            strokeWidth=".8"
          />
          <path
            d="M-8.8 -3.6 C-9.6 -6 -8.6 -8.6 -6 -9.6 C-3.6 -10.4 -2 -8.6 -2.4 -6.4 C-2.8 -4.8 -4 -4 -4.4 -2.8Z"
            fill="#FFFDF6"
            stroke={INK}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M-8.6 -8 C-11 -8.4 -12.4 -7.2 -11.6 -6.4 C-10.6 -5.8 -9.4 -6.2 -8.6 -6.8Z"
            fill="#F2A13A"
            stroke={INK}
            strokeWidth=".8"
            strokeLinejoin="round"
          />
          <circle cx="-6.2" cy="-7.8" r=".8" fill={INK} />
          <circle cx="-6.5" cy="-8.1" r=".28" fill="#FFFFFF" />
        </g>
      </g>
      <g transform="translate(16 2)">
        <g className="pw-duck" style={{ animationDelay: '-.8s' }}>
          <ellipse cx="0" cy="1" rx="10" ry="1.8" fill="#BFE0F2" opacity=".8" />
          <path
            d="M-8 -1 C-8 -5 -3 -6.4 2 -5.4 C5 -4.8 7 -6.8 8.2 -8.4 C8.8 -4.4 7.4 -.2 3 .4 L-6 .4 C-7.4 .2 -8 -.2 -8 -1Z"
            fill="#D9C6A2"
            stroke={INK}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M-2 -3.4 C1 -4.6 4.4 -3.6 4.8 -1.4 C2 -.6 -1 -.8 -2 -3.4Z"
            fill="#A7895C"
            stroke={INK}
            strokeWidth=".8"
          />
          <path
            d="M-8.8 -3.6 C-9.6 -6 -8.6 -8.6 -6 -9.6 C-3.6 -10.4 -2 -8.6 -2.4 -6.4 C-2.8 -4.8 -4 -4 -4.4 -2.8Z"
            fill="#3F7F55"
            stroke={INK}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M-8.6 -5.4 C-7 -4.6 -5 -4.6 -3.6 -5.6"
            stroke="#FFFFFF"
            strokeWidth="1.1"
            fill="none"
          />
          <path
            d="M-8.6 -8 C-11 -8.4 -12.4 -7.2 -11.6 -6.4 C-10.6 -5.8 -9.4 -6.2 -8.6 -6.8Z"
            fill="#F2A13A"
            stroke={INK}
            strokeWidth=".8"
            strokeLinejoin="round"
          />
          <circle cx="-6.2" cy="-7.8" r=".8" fill={INK} />
          <circle cx="-6.5" cy="-8.1" r=".28" fill="#FFFFFF" />
        </g>
      </g>
      <g stroke={INK} strokeWidth="2.4" strokeLinecap="round">
        <path d="M-58 4 C-59 -2 -60 -7 -62 -12 M-54 6 C-54 -1 -54 -8 -55 -15 M56 4 C57 -2 58 -7 60 -12" />
      </g>
      <g stroke="#4F8F3E" strokeWidth="1.2" strokeLinecap="round">
        <path d="M-58 4 C-59 -2 -60 -7 -62 -12 M-54 6 C-54 -1 -54 -8 -55 -15 M56 4 C57 -2 58 -7 60 -12" />
      </g>
      <g fill="#7A5230" stroke={INK} strokeWidth=".8">
        <ellipse cx="-61.6" cy="-13" rx="1.6" ry="3.4" transform="rotate(-18 -61.6 -13)" />
        <ellipse cx="-55.2" cy="-16" rx="1.6" ry="3.6" />
        <ellipse cx="59.6" cy="-13" rx="1.6" ry="3.4" transform="rotate(18 59.6 -13)" />
      </g>
    </g>
  )
}

/** Barn walls in the colour (front gable and side), the door cut out (evenodd) so it stays red. */
export const BARN_WALLS =
  'M22 263 L22 203 L70 167 L118 203 L118 263Z M46 219 L46 263 L94 263 L94 219Z M118 204 L148 214 L148 263 L118 263Z'
