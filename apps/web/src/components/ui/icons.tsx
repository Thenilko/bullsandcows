import type { SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number }

function Stroke({ size = 24, strokeWidth = 2.2, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function HomeIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <path d="M3 11l9-7 9 7v9H3z" />
      <path d="M9 20v-6h6v6" />
    </Stroke>
  )
}

export function TrophyIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </Stroke>
  )
}

export function UserIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" />
    </Stroke>
  )
}

export function QuestionIcon(p: IconProps) {
  return (
    <Stroke {...p}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4" />
      <path d="M12 17.5h.01" />
    </Stroke>
  )
}

export function SoundOnIcon({ size = 20, ...p }: IconProps) {
  return (
    <Stroke size={size} {...p}>
      <path d="M11 5L6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </Stroke>
  )
}

export function SoundOffIcon({ size = 20, ...p }: IconProps) {
  return (
    <Stroke size={size} {...p}>
      <path d="M11 5L6 9H3v6h3l5 4z" />
      <path d="M22 9l-6 6M16 9l6 6" />
    </Stroke>
  )
}

export function BackspaceIcon({ size = 22, ...p }: IconProps) {
  return (
    <Stroke size={size} strokeWidth={2.4} {...p}>
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <path d="M18 9l-6 6M12 9l6 6" />
    </Stroke>
  )
}

export function CrownIcon({ width = 30, height = 22, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 24"
      fill="#F2C230"
      stroke="#7A5230"
      strokeWidth="1.4"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      <path d="M2 7l7 6 7-11 7 11 7-6-3 15H5z" />
    </svg>
  )
}

export function BullIcon({ size = 36, ring = false }: { size?: number; ring?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 9C4 9 2 7 2 3.5c1.3 1.8 3 2.6 5.5 2.8z" fill="#F3E6C8" stroke="#2E3B24" strokeWidth=".8" />
      <path d="M17 9c3 0 5-2 5-5.5-1.3 1.8-3 2.6-5.5 2.8z" fill="#F3E6C8" stroke="#2E3B24" strokeWidth=".8" />
      <path d="M6.5 7.5h11l-1 8.5a4.5 4.5 0 0 1-9 0z" fill="#4A3427" stroke="#2E3B24" strokeWidth=".8" />
      <ellipse cx="12" cy="17.2" rx="3.6" ry="2.6" fill="#8A6A58" />
      <circle cx="9.6" cy="11.8" r="1" fill="#FFFFFF" />
      <circle cx="14.4" cy="11.8" r="1" fill="#FFFFFF" />
      {ring ? <circle cx="12" cy="20.2" r="1.4" fill="none" stroke="#D9AE52" strokeWidth=".9" /> : null}
    </svg>
  )
}

export function CowIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.4 7.6 C7.9 5.6 6.6 4.3 4.9 3.9 C5.7 5 6.2 6.4 6.4 7.8Z" fill="#EADBB8" stroke="#2E3B24" strokeWidth=".6" />
      <path d="M15.6 7.6 C16.1 5.6 17.4 4.3 19.1 3.9 C18.3 5 17.8 6.4 17.6 7.8Z" fill="#EADBB8" stroke="#2E3B24" strokeWidth=".6" />
      <path d="M7.2 9.4 2.5 8.4c.6 2 2.1 3.2 4.7 3.3z" fill="#F4EFE6" stroke="#2E3B24" strokeWidth=".8" />
      <path d="M6.6 9.7 3.8 9.1c.5 1.1 1.4 1.7 2.9 1.8z" fill="#F0B2AE" />
      <path d="M16.8 9.4l4.7-1c-.6 2-2.1 3.2-4.7 3.3z" fill="#F4EFE6" stroke="#2E3B24" strokeWidth=".8" />
      <path d="M17.4 9.7l2.8-.6c-.5 1.1-1.4 1.7-2.9 1.8z" fill="#F0B2AE" />
      <path d="M7 7h10l-.6 9a4.4 4.4 0 0 1-8.8 0z" fill="#FFFFFF" stroke="#2E3B24" strokeWidth=".8" />
      <path d="M12.6 7.1c2.2.2 3.6 1.5 4 3.4-1.9.7-3.7.1-4.2-1.6z" fill="#1F1F23" />
      <ellipse cx="12" cy="17" rx="3.8" ry="2.6" fill="#F0B2AE" stroke="#2E3B24" strokeWidth=".6" />
      <ellipse cx="9.6" cy="11.5" rx="1.5" ry="1.35" fill="#FFFFFF" stroke="#2E3B24" strokeWidth=".45" />
      <circle cx="9.8" cy="11.7" r=".8" fill="#2A1A10" />
      <circle cx="9.5" cy="11.3" r=".3" fill="#FFFFFF" />
      <ellipse cx="14.4" cy="11.5" rx="1.5" ry="1.35" fill="#FFFFFF" stroke="#2E3B24" strokeWidth=".45" />
      <circle cx="14.6" cy="11.7" r=".8" fill="#2A1A10" />
      <circle cx="14.3" cy="11.3" r=".3" fill="#FFFFFF" />
      <path d="M10.6 17.1h.01M13.4 17.1h.01" stroke="#9A5450" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

export type BadgeVariant = 1 | 2 | 3 | 4 | 5 | 6

const BADGE_STROKE = { fill: 'none', stroke: '#2E3B24', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function BadgeGlyph({ variant }: { variant: BadgeVariant }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...BADGE_STROKE}>
      {variant === 1 ? (
        <>
          <path d="M6 4v7a6 6 0 0 0 12 0V4" />
          <path d="M4 4h4M16 4h4" />
        </>
      ) : null}
      {variant === 2 ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="#2E3B24" />
        </>
      ) : null}
      {variant === 3 ? (
        <>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l3 2M9 2h6" />
        </>
      ) : null}
      {variant === 4 ? <path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5z" /> : null}
      {variant === 5 ? <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /> : null}
      {variant === 6 ? (
        <>
          <rect x="3" y="7" width="18" height="10" rx="3" />
          <path d="M7 12h.01M10 12h.01M13 12h.01M16 12h.01M19 12h.01" />
        </>
      ) : null}
    </svg>
  )
}
