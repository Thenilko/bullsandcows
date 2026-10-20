import type { GuessEntryDto } from '@bc/protocol'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CloseIcon, NotebookIcon, Soft, type DigitMark } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { History } from '../../screens/play/History'
import { useNotebook } from './store'

export interface NotebookProps {
  gameId: string
  guesses: readonly GuessEntryDto[]
  left: number
  /** `sheet`: mobile bottom sheet content (M4); `card`: desktop right column (D4). */
  layout: 'sheet' | 'card'
  onClose?: () => void
  /** Extra action next to "clear" (the give-up button). */
  footer?: ReactNode
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const
const STATE_KEYS = ['unknown', 'no', 'yes'] as const
const SHORT_KEYS = [null, 'no', 'yes'] as const
const HEADING = { margin: 0, fontWeight: 900 } as const
const HINT = { fontWeight: 700, color: '#6B7560' } as const

function DigitChips({ marks, cycle, desktop }: { marks: Readonly<Record<string, DigitMark>>; cycle(d: string): void; desktop: boolean }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${desktop ? 10 : 5}, minmax(0, 1fr))`, gap: desktop ? 6 : 8 }}>
      {DIGITS.map((d) => {
        const v = marks[d] ?? 0
        const short = SHORT_KEYS[v]
        return (
          <button
            key={d}
            type="button"
            className={cx('note', v === 1 && 'nx', v === 2 && 'nok')}
            style={desktop ? { height: 46, fontSize: 17 } : undefined}
            aria-label={t('notebook.digitAria', { digit: d, state: t(`notebook.state.${STATE_KEYS[v]}`) })}
            onClick={() => cycle(d)}
          >
            {d}
            <small>{short ? t(`notebook.short.${short}`) : ''}</small>
          </button>
        )
      })}
    </div>
  )
}

function Header({ left, layout, onClose }: Pick<NotebookProps, 'left' | 'layout' | 'onClose'>) {
  const { t } = useTranslation()
  if (layout === 'card') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h2 style={{ ...HEADING, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotebookIcon size={22} stroke="#8E3424" />
          {t('notebook.title')}
        </h2>
        <span style={{ ...HINT, fontSize: 13 }}>{t('notebook.hint')}</span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h2 style={{ ...HEADING, fontSize: 24 }}>{t('notebook.title')}</h2>
        <span style={{ fontWeight: 700, color: '#4A5640', fontSize: 14 }}>{t('notebook.left', { count: left })}</span>
      </div>
      <button type="button" className="iconbox icobtn" aria-label={t('notebook.close')} onClick={onClose}>
        <CloseIcon />
      </button>
    </div>
  )
}

/** Digit marks (3 states), attempts history and free notes of one game (M4 / D4). */
export function Notebook({ gameId, guesses, left, layout, onClose, footer }: NotebookProps) {
  const { t } = useTranslation()
  const nb = useNotebook(gameId)
  const desktop = layout === 'card'
  return (
    <>
      <Header left={left} layout={layout} onClose={onClose} />
      {desktop ? null : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={{ ...HEADING, fontSize: 16 }}>{t('notebook.digits')}</h3>
          <span style={{ ...HINT, fontSize: 12 }}>{t('notebook.hint')}</span>
        </div>
      )}
      <DigitChips marks={nb.marks} cycle={nb.cycle} desktop={desktop} />
      {desktop ? null : <h3 style={{ ...HEADING, margin: '4px 0 0', fontSize: 16 }}>{t('notebook.attempts')}</h3>}
      <div style={desktop ? { maxHeight: 260, overflowY: 'auto' } : undefined}>
        <History guesses={guesses} />
      </div>
      {desktop ? null : <h3 style={{ ...HEADING, margin: '4px 0 0', fontSize: 16 }}>{t('notebook.myNotes')}</h3>}
      <textarea
        className="notes-area"
        value={nb.text}
        placeholder={t('notebook.notesPlaceholder')}
        aria-label={t('notebook.myNotes')}
        onChange={(e) => nb.setText(e.target.value)}
      />
      <div style={{ display: 'grid', gridTemplateColumns: footer ? '1fr 1fr' : '1fr', gap: 10 }}>
        <Soft small onClick={nb.clearMarks}>
          {t('notebook.clear')}
        </Soft>
        {footer}
      </div>
    </>
  )
}
