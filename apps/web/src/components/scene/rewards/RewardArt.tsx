/**
 * The pasture rewards as drawn in PasExtras.dc.html, each around its own origin; the scenes and the list place
 * and scale them. The loops (`pw-*` in pasishte.css) pause with the scene's idle freeze and under reduced motion.
 */

const INK = '#2E3B24'
const PETALS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const

/** Кученце Шаро, sitting; the tail wags. Feet at y 22. */
export function Dog() {
  return (
    <g className="pw-dog">
      <ellipse cx="0" cy="22" rx="18" ry="3" fill="#1E2A14" opacity=".2" />
      <path d="M14 6 C24 2 26 -8 22 -12" stroke={INK} strokeWidth="4.4" fill="none" strokeLinecap="round" className="pw-tailwag" />
      <path d="M14 6 C24 2 26 -8 22 -12" stroke="#C48E55" strokeWidth="2" fill="none" strokeLinecap="round" className="pw-tailwag" />
      <path d="M-8 -6 C-10 6 -8 18 -4 22 L14 22 C18 16 18 4 12 -6 Z" fill="#C48E55" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-4 4 C-2 12 2 18 6 20 L0 22 C-4 18 -6 10 -4 4Z" fill="#FFF3DD" />
      <path d="M-7 22 L-7 14 M3 22 L3 15" stroke={INK} strokeWidth="1.6" />
      <circle cx="-4" cy="-14" r="11" fill="#C48E55" stroke={INK} strokeWidth="1.8" />
      <path
        d="M-12 -22 C-20 -20 -20 -8 -15 -6 C-12 -10 -11 -16 -12 -22Z M4 -22 C10 -24 13 -14 9 -8 C6 -12 4 -16 4 -22Z"
        fill="#7A5230"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <ellipse cx="-6" cy="-9" rx="6" ry="4.5" fill="#FFF3DD" />
      <circle cx="-7.5" cy="-11" r="2" fill={INK} />
      <circle cx="-8" cy="-16" r="1.6" fill={INK} />
      <circle cx="0" cy="-16" r="1.6" fill={INK} />
      <path d="M-10 -4 C-6 -1 -1 -2 2 -5" stroke="#B5452F" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  )
}

/** One sunflower: the head at the origin nods, the stem goes down to y 34. */
export function Sunflower() {
  return (
    <g>
      <path d="M0 0 C1 12 -1 22 0 34" stroke={INK} strokeWidth="3.6" fill="none" />
      <path d="M0 0 C1 12 -1 22 0 34" stroke="#5E9E46" strokeWidth="1.8" fill="none" />
      <path d="M0 18 C-8 12 -12 16 -12 18 C-8 22 -4 20 0 18Z M0 24 C8 18 12 22 12 24 C8 28 4 26 0 24Z" fill="#7DBE59" stroke={INK} strokeWidth="1" />
      <g className="pw-nod">
        {PETALS.map((deg) => (
          <ellipse key={deg} cx="0" cy="-7" rx="2.6" ry="5" fill="#F2C230" stroke={INK} strokeWidth=".9" transform={`rotate(${deg})`} />
        ))}
        <circle r="5.5" fill="#7A5230" stroke={INK} strokeWidth="1.2" />
      </g>
    </g>
  )
}

/** The skep on its post with three buzzing bees. Post down to y 20. */
export function Beehive() {
  return (
    <g>
      <rect x="-3" y="6" width="6" height="14" fill="#86592F" stroke={INK} strokeWidth="1.2" />
      <path d="M-14 8 C-16 -6 -8 -16 0 -16 C8 -16 16 -6 14 8 Z" fill="#E2B85A" stroke={INK} strokeWidth="1.6" />
      <path d="M-14 2 H14 M-12 -4 H12 M-8 -10 H8" stroke="#B88A2E" strokeWidth="1.4" />
      <ellipse cx="0" cy="4" rx="3" ry="2.6" fill={INK} />
      <g className="pw-bees">
        <circle cx="18" cy="-10" r="1.6" fill={INK} />
        <circle cx="-16" cy="-16" r="1.6" fill={INK} />
        <circle cx="8" cy="-24" r="1.6" fill={INK} />
      </g>
    </g>
  )
}

/** The rooster, standing at about y 6. */
export function Rooster() {
  return (
    <g>
      <path d="M-6 0 C-10 -8 -6 -16 0 -16 C6 -16 8 -10 6 -4 C10 -8 16 -8 14 0 C12 6 4 8 -2 6Z" fill="#F3EDE2" stroke={INK} strokeWidth="1.4" />
      <path d="M-1 -16 C-2 -21 2 -22 3 -18 C4 -22 7 -21 6 -16Z" fill="#D63A2F" stroke={INK} strokeWidth="1" />
      <path d="M-6 -11 L-10 -9 L-6 -8Z" fill="#F2C230" />
      <circle cx="-3" cy="-12" r=".9" fill={INK} />
      <path d="M10 -6 C16 -14 20 -6 16 -2" fill="#4F8F3E" stroke={INK} strokeWidth="1" />
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
      <path d="M-3 -16 L14 -30 L31 -16" stroke="#3E2A1F" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="9" y="-12" width="10" height="12" fill="#8E3424" stroke="#F3EDE2" strokeWidth="1.2" />
    </g>
  )
}

/** The golden weathervane (a rooster on a rod), its rod's foot at y 12. */
export function GoldenVane() {
  return (
    <g className="pw-vane">
      <path d="M0 12 V-4" stroke="#B8860B" strokeWidth="1.6" />
      <path d="M-8 -4 C-8 -10 -2 -14 2 -12 C6 -10 4 -6 8 -6 C10 -10 14 -8 12 -4Z" fill="#F2C230" stroke="#8C6420" strokeWidth=".9" />
      <circle cx="0" cy="-4" r="1.2" fill="#B8860B" />
    </g>
  )
}

/** The pond with two bobbing ducks and reeds, centred on the origin. */
export function Pond() {
  return (
    <g>
      <ellipse rx="56" ry="15" fill="#6FA3C8" stroke={INK} strokeWidth="1.6" />
      <path d="M-34 -2 C-20 -6 -6 -6 6 -3 M10 4 C22 2 32 2 42 4" stroke="#BFE0F2" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g className="pw-duck">
        <path d="M-22 -6 C-22 -12 -14 -12 -12 -8 C-10 -12 -4 -12 -4 -7 C-4 -3 -10 -2 -16 -2 C-20 -2 -22 -3 -22 -6Z" fill="#FFFDF6" stroke={INK} strokeWidth="1.1" />
        <path d="M-23 -9 l-4 1 4 1Z" fill="#F2A13A" />
        <circle cx="-19" cy="-9" r=".8" fill={INK} />
      </g>
      <g className="pw-duck" style={{ animationDelay: '-.8s' }}>
        <path d="M8 -4 C8 -10 16 -10 18 -6 C20 -10 26 -10 26 -5 C26 -1 20 0 14 0 C10 0 8 -1 8 -4Z" fill="#F2C230" stroke={INK} strokeWidth="1.1" />
        <path d="M7 -7 l-4 1 4 1Z" fill="#F2A13A" />
        <circle cx="11" cy="-7" r=".8" fill={INK} />
      </g>
      <path d="M-58 2 l-3 -10 M-54 4 l-1 -12 M56 2 l3 -10 M52 4 l1 -12" stroke="#3F7F2E" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

/** Barn walls in the colour (front gable and side), the door cut out (evenodd) so it stays red. */
export const BARN_WALLS = 'M22 263 L22 203 L70 167 L118 203 L118 263Z M46 219 L46 263 L94 263 L94 219Z M118 204 L148 214 L148 263 L118 263Z'
