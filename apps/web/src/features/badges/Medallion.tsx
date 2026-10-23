import { BADGE_GLYPHS, type BadgeGlyph } from '@bc/game-core'
import { CowIcon, ScarecrowIcon } from '../../components/ui/characters'
import { cx } from '../../components/ui/cx'
import type { MedalClass } from './badgeModel'

export interface MedallionProps {
  glyph: BadgeGlyph
  md: MedalClass
  /** 110px (the detail) instead of 52px. */
  xl?: boolean
  className?: string
}

const GLYPH = { size: 26, stroke: 2.2 } as const
const GLYPH_XL = { size: 54, stroke: 2 } as const
const HEAD = 34
const HEAD_XL = 70

/** The round badge (`.md`): a 24×24 stroke glyph, or the cow / Scarecrow head for `allCows` and `bot1–4`. */
export function Medallion({ glyph, md, xl = false, className }: MedallionProps) {
  const head = xl ? HEAD_XL : HEAD
  const g = xl ? GLYPH_XL : GLYPH
  return (
    <span className={cx('md', md, xl && 'md-xl', className)} data-glyph={glyph}>
      {glyph === 'cow' ? (
        <CowIcon size={head} />
      ) : glyph === 'scarecrow' ? (
        <ScarecrowIcon size={head} />
      ) : (
        <svg
          width={g.size}
          height={g.size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2E3B24"
          strokeWidth={g.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={BADGE_GLYPHS[glyph]} />
        </svg>
      )}
    </span>
  )
}
