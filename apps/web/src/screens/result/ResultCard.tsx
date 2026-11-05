import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Confetti, Inset } from '../../components/ui'
import { useIsDesktop } from '../../hooks/useIsDesktop'

const FULL_SCREEN = { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20 } as const
// Desktop (Desk.dc.html): the dim at 19, the modal at 20 and the confetti at 21 sit above the shell header (6).
const OVERLAY = { position: 'fixed', inset: 0, zIndex: 10 } as const
const OVERLAY_DESKTOP = { ...OVERLAY, zIndex: 19 } as const
const CONFETTI_DESKTOP = { ...FULL_SCREEN, zIndex: 21 } as const
const SHEET_BASE = {
  position: 'fixed',
  zIndex: 11,
  background: '#FFFDF6',
  display: 'flex',
  flexDirection: 'column',
  textAlign: 'center',
  overflowY: 'auto',
} as const
const SHEET_MOBILE = {
  ...SHEET_BASE,
  left: 10,
  right: 10,
  bottom: 10,
  maxHeight: 'calc(100dvh - 20px)',
  borderRadius: 28,
  boxShadow: '0 18px 40px rgba(30,40,20,.3)',
} as const
const SHEET_DESKTOP = {
  ...SHEET_BASE,
  zIndex: 20,
  left: 0,
  right: 0,
  top: 90,
  margin: '0 auto',
  width: 'min(560px, calc(100% - 32px))',
  maxHeight: 'calc(100dvh - 110px)',
  padding: '30px 28px 24px',
  borderRadius: 30,
  boxShadow: '0 24px 60px rgba(30,40,20,.35)',
  gap: 14,
} as const
const KICKER = {
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: '.12em',
  color: 'var(--c-muted-aa)',
} as const

export interface ResultCardProps {
  /** „ЧИСЛОТО Е 5274“ above the title. */
  kicker: string
  title: string
  /** Confetti over everything (a win). */
  won: boolean
  children: ReactNode
}

/**
 * The result (M5 bottom sheet / D5 centred card over a dimmed pasture): the kicker with the number, the big
 * title, then the screen's own content. Shared by the solo result and the duels.
 */
export function ResultCard({ kicker, title, won, children }: ResultCardProps) {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  return (
    <>
      <div
        className="fadein"
        data-testid="result-overlay"
        style={
          desktop
            ? { ...OVERLAY_DESKTOP, background: 'rgba(30,40,20,.35)' }
            : { ...OVERLAY, background: 'rgba(30,40,20,.4)' }
        }
      />
      <div style={desktop ? CONFETTI_DESKTOP : FULL_SCREEN}>
        <Confetti active={won} />
      </div>
      <section
        className={desktop ? 'rise' : 'sheetup result-sheet'}
        aria-label={t('result.area')}
        style={desktop ? SHEET_DESKTOP : SHEET_MOBILE}
      >
        <span style={KICKER}>{kicker}</span>
        <h2 style={{ margin: '-4px 0 0', fontSize: desktop ? 36 : 28, fontWeight: 900 }}>
          {title}
        </h2>
        {children}
      </section>
    </>
  )
}

export interface TileData {
  value: string | number
  label: string
  /** Background of a highlighted tile (the points, a rating gain). */
  tint?: string
  /** Colour of the value (a rating loss in red). */
  color?: string
}

function Tile({ value, label, tint, color }: TileData) {
  return (
    <Inset style={{ padding: '8px 2px', background: tint }}>
      <div style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#4A5640' }}>{label}</div>
    </Inset>
  )
}

/** The stat tiles in one row (опита, време, точки…). */
export function Tiles({ tiles }: { tiles: readonly TileData[] }) {
  const desktop = useIsDesktop()
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`,
        gap: desktop ? 10 : 6,
      }}
    >
      {tiles.map((tile) => (
        <Tile key={tile.label} {...tile} />
      ))}
    </div>
  )
}
