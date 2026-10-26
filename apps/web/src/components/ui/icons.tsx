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

export { BullIcon, CowIcon, ScarecrowIcon } from './characters'

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

export function NotebookIcon({ size = 22, stroke = '#2E3B24', ...p }: IconProps & { stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z" />
      <path d="M6 3v18M4 7h4M4 12h4M4 17h4M10 8h6M10 12h5" />
    </svg>
  )
}

export function CameraIcon({ size = 20, ...p }: IconProps) {
  return (
    <Stroke size={size} {...p}>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </Stroke>
  )
}

export function CloseIcon({ size = 20, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2E3B24" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
