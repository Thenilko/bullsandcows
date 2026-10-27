import type { CSSProperties, ReactNode } from 'react'

export const MUTED: CSSProperties = { fontSize: 12, fontWeight: 800, color: 'var(--c-muted-aa)' }
export const KICKER: CSSProperties = { fontSize: 12, fontWeight: 900, letterSpacing: '.1em', color: 'var(--c-muted-aa)', textTransform: 'uppercase' }
export const BODY: CSSProperties = { margin: 0, fontWeight: 700, color: '#4A5640', lineHeight: 1.5 }
export const ERROR: CSSProperties = { margin: 0, fontSize: 13, fontWeight: 800, color: '#8A1F0B' }
export const DANGER: CSSProperties = { color: '#8A1F0B' }

/** A title row: bold text on the left, a muted note on the right (baseline aligned). */
export function TitleRow({ title, note, level = 2 }: { title: ReactNode; note?: ReactNode; level?: 1 | 2 }) {
  const H = level === 1 ? 'h1' : 'h2'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
      <H style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>{title}</H>
      {note ? <span style={MUTED}>{note}</span> : null}
    </div>
  )
}

/** A round medal with a 24×24 stroke icon (`.md md-gold` / `md-silver` of pasishte.css). */
export function Medal({ tone, size = 44, children }: { tone: 'gold' | 'silver'; size?: number; children: ReactNode }) {
  return (
    <span className={`md md-${tone}`} style={{ width: size, height: size }} aria-hidden="true">
      {children}
    </span>
  )
}

const glyph = (d: string, size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

export const HouseGlyph = ({ size = 22 }: { size?: number }) => glyph('M3 11l9-7 9 7v9H3zM9 20v-6h6v6', size)
export const UserPlusGlyph = ({ size = 22 }: { size?: number }) => glyph('M10 11a4 4 0 1 0 0-8a4 4 0 1 0 0 8M3 21c1-4 4-6 7-6s6 2 7 6M19 8v6M16 11h6', size)
export const BellGlyph = ({ size = 20 }: { size?: number }) => glyph('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0', size)
export const GearGlyph = ({ size = 20 }: { size?: number }) =>
  glyph('M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z', size)
