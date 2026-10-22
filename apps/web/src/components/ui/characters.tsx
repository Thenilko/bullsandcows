import { useId } from 'react'

/**
 * The three characters of the design board „Персонажи“: head portraits on the 124×124 box
 * centred at the origin, drawn at any size. The bull is the player, the cow a human
 * opponent, the scarecrow („Плашилото“) the bot.
 */
interface HeadProps {
  size?: number
}

const BOX = '-62 -66 124 124'
const LINE = { stroke: '#2E3B24', strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

export function BullIcon({ size = 36 }: HeadProps) {
  return (
    <svg width={size} height={size} viewBox={BOX} aria-hidden="true">
      <g {...LINE}>
        <path d="M-20 -30 C-34 -30 -47 -40 -52 -60 C-42 -51 -31 -47 -16 -45 Z" fill="#F3E6C8" />
        <path d="M20 -30 C34 -30 47 -40 52 -60 C42 -51 31 -47 16 -45 Z" fill="#F3E6C8" />
        <path d="M-23 -20 C-36 -28 -50 -24 -55 -14 C-46 -6 -33 -7 -22 -11 Z" fill="#4A3427" />
        <path d="M23 -20 C36 -28 50 -24 55 -14 C46 -6 33 -7 22 -11 Z" fill="#4A3427" />
        <path d="M-27 -38 C-14 -47 14 -47 27 -38 C33 -18 30 6 26 20 L-26 20 C-30 6 -33 -18 -27 -38 Z" fill="#5E3E2C" />
        <path d="M-13 -43 C-9 -54 -3 -47 0 -57 C3 -47 9 -54 13 -43 C6 -38 -6 -38 -13 -43 Z" fill="#3A2619" />
        <ellipse cx="0" cy="22" rx="27" ry="18" fill="#A07B64" />
      </g>
      <ellipse cx="-10" cy="21" rx="4" ry="5.5" fill="#2E1E16" />
      <ellipse cx="10" cy="21" rx="4" ry="5.5" fill="#2E1E16" />
      <path d="M-7 29 C-7 39 7 39 7 29" fill="none" stroke="#E2B44A" strokeWidth="4" strokeLinecap="round" />
      <circle cx="-12" cy="-10" r="6.5" fill="#FFFFFF" stroke="#2E3B24" strokeWidth="2" />
      <circle cx="-11" cy="-9" r="3.8" fill="#1A120C" />
      <circle cx="-12.4" cy="-10.6" r="1.4" fill="#FFFFFF" />
      <circle cx="12" cy="-10" r="6.5" fill="#FFFFFF" stroke="#2E3B24" strokeWidth="2" />
      <circle cx="11" cy="-9" r="3.8" fill="#1A120C" />
      <circle cx="9.6" cy="-10.6" r="1.4" fill="#FFFFFF" />
      <path d="M-19 -20 L-6 -18 M19 -20 L6 -18" stroke="#2A1A10" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const COW_FACE = 'M-26 -36 C-13 -45 13 -45 26 -36 C32 -16 29 6 25 20 L-25 20 C-29 6 -32 -16 -26 -36 Z'

export function CowIcon({ size = 36 }: HeadProps) {
  const clip = useId()
  return (
    <svg width={size} height={size} viewBox={BOX} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d={COW_FACE} />
        </clipPath>
      </defs>
      <g {...LINE}>
        <path d="M-15 -38 C-18 -48 -24 -55 -31 -58 C-30 -49 -27 -42 -23 -35 Z" fill="#EADBB8" />
        <path d="M15 -38 C18 -48 24 -55 31 -58 C30 -49 27 -42 23 -35 Z" fill="#EADBB8" />
        <path d="M-22 -20 C-37 -29 -51 -23 -56 -12 C-46 -4 -32 -6 -21 -11 Z" fill="#FFFDF6" />
        <path d="M22 -20 C37 -29 51 -23 56 -12 C46 -4 32 -6 21 -11 Z" fill="#26262B" />
        <path d={COW_FACE} fill="#FFFDF6" />
      </g>
      <g clipPath={`url(#${clip})`}>
        <path d="M2 -48 C18 -50 34 -42 32 -22 C30 -6 20 0 10 -4 C0 -9 -4 -26 2 -48 Z" fill="#26262B" />
        <path d="M-30 4 C-22 0 -16 8 -20 16 C-24 22 -32 20 -32 14 Z" fill="#26262B" />
      </g>
      <path d={COW_FACE} fill="none" stroke="#2E3B24" strokeWidth="3" strokeLinejoin="round" />
      <path d="M-30 -18 C-40 -23 -48 -20 -50 -14 C-43 -10 -35 -11 -29 -14 Z" fill="#F0B2AE" />
      <ellipse cx="0" cy="22" rx="26" ry="17" fill="#F4B9B2" stroke="#2E3B24" strokeWidth="3" />
      <ellipse cx="-10" cy="21" rx="3.6" ry="5" fill="#A2504C" />
      <ellipse cx="10" cy="21" rx="3.6" ry="5" fill="#A2504C" />
      <path d="M-6 31 Q0 34 6 31" fill="none" stroke="#A2504C" strokeWidth="2" strokeLinecap="round" />
      <circle cx="-12" cy="-10" r="6.5" fill="#FFFFFF" stroke="#2E3B24" strokeWidth="2" />
      <circle cx="-11" cy="-8.6" r="3.8" fill="#3B2416" />
      <circle cx="-12.4" cy="-10.4" r="1.4" fill="#FFFFFF" />
      <circle cx="12" cy="-10" r="6.5" fill="#FFFFFF" stroke="#2E3B24" strokeWidth="2" />
      <circle cx="11" cy="-8.6" r="3.8" fill="#3B2416" />
      <circle cx="9.6" cy="-10.4" r="1.4" fill="#FFFFFF" />
      <path
        d="M-17 -18 l-3 -3 M-13 -19.5 l-1.5 -3.8 M-8.5 -19 l0 -4 M17 -18 l3 -3 M13 -19.5 l1.5 -3.8 M8.5 -19 l0 -4"
        stroke="#2E3B24"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

const STRAW_LEGS = 'M-24 30 L-34 46 M-16 33 L-20 50 M-6 35 L-6 52 M6 35 L7 52 M16 33 L21 50 M24 30 L34 45'
const STRAW_ARMS = 'M-28 -22 L-48 -14 M-30 -14 L-50 -4 M-31 -6 L-46 4 M28 -22 L48 -14 M30 -14 L50 -4 M31 -6 L46 4'

/** „Плашилото“, the bot: a sack head with button eyes under a straw hat. */
export function ScarecrowIcon({ size = 40 }: HeadProps) {
  return (
    <svg width={size} height={size} viewBox={BOX} aria-hidden="true">
      <g {...LINE}>
        <path d={STRAW_LEGS} stroke="#C9A033" strokeWidth="4" />
        <path d={STRAW_LEGS} stroke="#F2CF5B" strokeWidth="2" />
        <path d={STRAW_ARMS} stroke="#C9A033" strokeWidth="4" />
        <path d={STRAW_ARMS} stroke="#F2CF5B" strokeWidth="2" />
        <path d="M-29 -30 C-34 -8 -33 12 -25 26 C-13 37 13 37 25 26 C33 12 34 -8 29 -30 Z" fill="#E6CC9C" />
      </g>
      <path
        d="M-24 -18 C-10 -14 10 -14 24 -18 M-28 4 C-12 8 12 8 28 4 M-22 22 C-8 25 8 25 22 22"
        fill="none"
        stroke="#C9AE7E"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M-26 27 C-12 36 12 36 26 27" fill="none" stroke="#8A5A2B" strokeWidth="6" strokeLinecap="round" />
      <path d="M-26 27 C-12 36 12 36 26 27" fill="none" stroke="#2E3B24" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.1 5" />
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
    </svg>
  )
}
