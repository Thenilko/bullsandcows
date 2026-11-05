import type { Len } from '@bc/game-core'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Keypad, Slots, Soft, type DigitMark } from '../../components/ui'
import { SoundIconButton } from '../../components/ui/SoundIconButton'

// The building blocks of the play panel, shared by the solo game and the duels (same look, own data).

const ERR_STYLE = {
  margin: 0,
  minHeight: 16,
  textAlign: 'center',
  fontWeight: 800,
  color: '#8A1F0B',
} as const
const GIVE_UP_STYLE = { color: '#8A1F0B' } as const
const LINE = { fontWeight: 700, fontSize: 13, color: '#4A5640' } as const
const ELLIPSIS = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const
// Two lines at most (the race note before the first guess), then an ellipsis.
const CLAMP = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const
const HEAD_ROW = { display: 'flex', alignItems: 'center', gap: 8 } as const
const PILL_ROW = { display: 'flex', alignItems: 'center', gap: 6 } as const

/** „Опит N · …“ and, under it, the last verdict (one line, ellipsis) or a note (`wrap`: up to two lines). */
export function PlayStatus({
  title,
  line,
  wrap = false,
  after,
}: {
  title: ReactNode
  line?: ReactNode
  wrap?: boolean
  after?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
      <span style={{ fontWeight: 900, fontSize: 15 }}>{title}</span>
      {line ? <span style={{ ...LINE, ...(wrap ? CLAMP : ELLIPSIS) }}>{line}</span> : null}
      {after}
    </div>
  )
}

/** The panel's head row (M3): the status on the left, the notebook button and the sound toggle on the right. */
export function PanelHead({ children, notes }: { children: ReactNode; notes: ReactNode }) {
  return (
    <div style={HEAD_ROW}>
      {children}
      {notes}
      <SoundIconButton />
    </div>
  )
}

export interface GameInputProps {
  len: Len
  zero: boolean
  cur: string
  sel: number | null
  shake: number
  /** The slots take input (the caret shows). */
  active: boolean
  /** The keypad is locked. */
  disabled: boolean
  /** The line under the slots (a rejected guess); empty keeps its height. */
  error: string
  marks: Readonly<Record<string, DigitMark>>
  desktop: boolean
  /** Laid over the keypad (a classic duel: „Боби мисли“ while it is the opponent's turn). */
  keypadOverlay?: ReactNode
  onPress(d: string): void
  onBack(): void
  onSubmit(): void
  onSelect?(slot: number): void
}

/** The signs, the error line and the keypad. */
export function GameInput(p: GameInputProps) {
  const keypad = (
    <Keypad
      len={p.len}
      zero={p.zero}
      current={p.cur}
      selected={p.sel}
      marks={p.marks}
      disabled={p.disabled}
      onPress={p.onPress}
      onBack={p.onBack}
      onSubmit={p.onSubmit}
      layout={p.desktop ? 'desktop' : 'mobile'}
    />
  )
  return (
    <>
      <Slots
        len={p.len}
        current={p.cur}
        active={p.active}
        shake={p.shake}
        big={p.desktop}
        selected={p.sel}
        onSelect={p.onSelect}
      />
      <p role="status" style={{ ...ERR_STYLE, fontSize: p.desktop ? 14 : 13 }}>
        {p.error}
      </p>
      {/* Always wrapped, so the keys never remount when the overlay comes and goes (a classic duel's turns). */}
      <div style={{ position: 'relative' }}>
        {keypad}
        {p.keypadOverlay}
      </div>
    </>
  )
}

/** „Предавам се“ at the foot of the notebook. */
export function GiveUpButton({ disabled, onClick }: { disabled: boolean; onClick(): void }) {
  const { t } = useTranslation()
  return (
    <Soft small style={GIVE_UP_STYLE} disabled={disabled} onClick={onClick}>
      {t('notebook.giveUp')}
    </Soft>
  )
}

function BackChevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

/** „‹ Меню“: shown by `.ps-exit` only in focus mode (compact phones hide the tab bar); leads to the leaderboard, as in PasMobile `exitPlay`. */
export function ExitButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="ps-hud ps-exit"
      aria-label={t('play.exitAria')}
      onClick={() => void navigate('/board')}
    >
      <BackChevron />
      {t('play.exit')}
    </button>
  )
}

/** Phones: „‹ Меню“ and the pills in one row at the top of the scene, the attempts board hanging under it. */
export function PhoneHud({ pills, board }: { pills: ReactNode; board: ReactNode }) {
  return (
    <>
      <div style={PILL_ROW}>
        <ExitButton />
        {pills}
      </div>
      {board}
    </>
  )
}
