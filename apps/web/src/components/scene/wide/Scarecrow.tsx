const STRAW_LEGS = 'M-24 30 L-34 46 M-16 33 L-20 50 M-6 35 L-6 52 M6 35 L7 52 M16 33 L21 50 M24 30 L34 45'
const STRAW_ARMS = 'M-28 -22 L-48 -14 M-30 -14 L-50 -4 M-31 -6 L-46 4 M28 -22 L48 -14 M30 -14 L50 -4 M31 -6 L46 4'
const STRAW_HANDS = 'M-55 -95 l-10 -5 M-55 -92 l-12 1 M-55 -89 l-9 7 M55 -95 l10 -5 M55 -92 l12 1 M55 -89 l9 7'
const STRAW_FEET = 'M-12 -44 l-4 12 M-4 -44 l-1 13 M4 -44 l1 13 M12 -44 l4 12'
const MOUTH = 'M-26 27 C-12 36 12 36 26 27'
const LINE = { stroke: '#2E3B24', strokeWidth: 5, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

/** The character's head („Плашилото“) as drawn on the wide scene: thicker outline than the icon, at scale .52. */
function ScarecrowHead() {
  return (
    <g transform="translate(0 -128) scale(.52)">
      <g {...LINE}>
        <path d={STRAW_LEGS} stroke="#C9A033" strokeWidth="6" />
        <path d={STRAW_LEGS} stroke="#F2CF5B" strokeWidth="4" />
        <path d={STRAW_ARMS} stroke="#C9A033" strokeWidth="6" />
        <path d={STRAW_ARMS} stroke="#F2CF5B" strokeWidth="4" />
        <path d="M-29 -30 C-34 -8 -33 12 -25 26 C-13 37 13 37 25 26 C33 12 34 -8 29 -30 Z" fill="#E6CC9C" />
      </g>
      <path d="M-24 -18 C-10 -14 10 -14 24 -18 M-28 4 C-12 8 12 8 28 4 M-22 22 C-8 25 8 25 22 22" fill="none" stroke="#C9AE7E" strokeWidth="1.6" strokeLinecap="round" />
      <path d={MOUTH} fill="none" stroke="#8A5A2B" strokeWidth="6" strokeLinecap="round" />
      <path d={MOUTH} fill="none" stroke="#2E3B24" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.1 5" />
      <path d="M2 33 l-6 9 M2 33 l7 8" stroke="#8A5A2B" strokeWidth="3.4" strokeLinecap="round" />
      <g {...LINE}>
        <path d="M-24 -32 C-26 -46 -20 -60 0 -62 C20 -60 26 -46 24 -32 Z" fill="#B98A45" />
        <path d="M-23 -38 C-8 -35 8 -35 23 -38 L24 -32 C8 -29 -8 -29 -24 -32 Z" fill="#B5452F" />
        <ellipse cx="0" cy="-30" rx="55" ry="10" fill="#D8B060" />
      </g>
      <path d="M-50 -30 C-30 -25 30 -25 50 -30" fill="none" stroke="#B98A45" strokeWidth="2" strokeLinecap="round" />
      <rect x="6" y="-55" width="11" height="10" rx="1.5" fill="#7FA35B" stroke="#2E3B24" strokeWidth="1.8" transform="rotate(8 11 -50)" />
      <path d="M7 -56 l1 -2 M12 -56 l0 -2 M17 -55 l1 -2" stroke="#2E3B24" strokeWidth="1.3" strokeLinecap="round" transform="rotate(8 11 -50)" />
      <path d="M-14 -40 C-10 -50 -4 -55 2 -57" fill="none" stroke="#D6A85E" strokeWidth="2.4" strokeLinecap="round" />
      <g stroke="#2E3B24" strokeWidth="2">
        <circle cx="-12" cy="-10" r="7" fill="#3A2A20" />
        <circle cx="12" cy="-10" r="7" fill="#4A7FB0" />
      </g>
      <g fill="#E6CC9C">
        <circle cx="-14" cy="-12" r="1.3" />
        <circle cx="-10" cy="-12" r="1.3" />
        <circle cx="-14" cy="-8" r="1.3" />
        <circle cx="-10" cy="-8" r="1.3" />
        <circle cx="10" cy="-12" r="1.3" />
        <circle cx="14" cy="-12" r="1.3" />
        <circle cx="10" cy="-8" r="1.3" />
        <circle cx="14" cy="-8" r="1.3" />
      </g>
      <path d="M0 -2 L-5 8 L5 8 Z" fill="#E07A3A" stroke="#2E3B24" strokeWidth="2" strokeLinejoin="round" />
      <path d="M-3 4 l2 0 M1 6 l2 0" stroke="#A9531F" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="-21" cy="5" r="5" fill="#F0A0A0" opacity=".55" />
      <circle cx="21" cy="5" r="5" fill="#F0A0A0" opacity=".55" />
      <path d="M-16 13 C-8 21 8 21 16 13" fill="none" stroke="#2E3B24" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M-13 12 l1.5 5 M-7 15.5 l0.6 5 M0 16.6 l0 5 M7 15.5 l-0.6 5 M13 12 l-1.5 5" stroke="#2E3B24" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  )
}

/** „Плашилото“ on its pole by the oak; sways (`sc-sway`) unless motion is reduced. */
export function Scarecrow({ reduced }: { reduced: boolean }) {
  return (
    <g transform="translate(1400 700) scale(1.15)">
      <g className={reduced ? undefined : 'sc-sway'}>
        <rect x="-4" y="-122" width="8" height="122" rx="2" fill="#86592F" stroke="#2E3B24" strokeWidth="3" />
        <rect x="-52" y="-96" width="104" height="9" rx="3" fill="#86592F" stroke="#2E3B24" strokeWidth="3" />
        <path d={STRAW_HANDS} stroke="#C9A033" strokeWidth="5" strokeLinecap="round" />
        <path d={STRAW_HANDS} stroke="#F2CF5B" strokeWidth="2.4" strokeLinecap="round" />
        <path
          d="M-50 -100 L-26 -102 C-30 -76 -26 -56 -20 -44 L20 -44 C26 -56 30 -76 26 -102 L50 -100 L50 -84 L28 -84 L22 -84 L-22 -84 L-28 -84 L-50 -84Z"
          fill="#4A7FB0"
          stroke="#2E3B24"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="-14" y="-76" width="13" height="12" rx="1.5" fill="#D08A2E" stroke="#2E3B24" strokeWidth="2" />
        <path d="M4 -70 l8 8 M12 -70 l-8 8" stroke="#E9D7B4" strokeWidth="2.4" strokeLinecap="round" />
        <path d={STRAW_FEET} stroke="#C9A033" strokeWidth="5" strokeLinecap="round" />
        <path d={STRAW_FEET} stroke="#F2CF5B" strokeWidth="2.4" strokeLinecap="round" />
        <ScarecrowHead />
      </g>
    </g>
  )
}
