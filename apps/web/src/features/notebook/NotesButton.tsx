import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { NotebookIcon } from '../../components/ui'
import { countNotes, useNotebook } from './store'

const BADGE_STYLE = {
  position: 'absolute',
  top: -4,
  right: -4,
  minWidth: 18,
  height: 18,
  padding: '0 4px',
  borderRadius: 9,
  background: '#B5452F',
  color: '#FFFFFF',
  fontSize: 11,
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

export interface NotesButtonProps {
  gameId: string
  onClick(): void
  buttonRef?: RefObject<HTMLButtonElement | null>
}

/** Icon button that opens the mobile notebook sheet; the badge counts marked digits (+1 for free text). */
export function NotesButton({ gameId, onClick, buttonRef }: NotesButtonProps) {
  const { t } = useTranslation()
  const count = countNotes(useNotebook(gameId))
  return (
    <button
      ref={buttonRef}
      type="button"
      className="iconbox icobtn"
      style={{ position: 'relative' }}
      aria-label={t('notebook.title')}
      onClick={onClick}
    >
      <NotebookIcon />
      {count > 0 ? (
        <span aria-hidden="true" style={BADGE_STYLE}>
          {count}
        </span>
      ) : null}
    </button>
  )
}
