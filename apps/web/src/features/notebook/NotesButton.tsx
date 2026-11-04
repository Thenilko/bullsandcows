import { useRef, type RefObject } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { NotebookIcon } from '../../components/ui'
import { Bubble } from '../coach/Bubble'
import { useCoach } from '../coach/store'
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
  /** Show the one-time „this is your notebook“ tip next to the button. */
  tip?: boolean
}

/** Icon button that opens the mobile notebook sheet; the badge counts marked digits (+1 for free text). */
export function NotesButton({ gameId, onClick, buttonRef, tip = false }: NotesButtonProps) {
  const { t } = useTranslation()
  const count = countNotes(useNotebook(gameId))
  const ownRef = useRef<HTMLButtonElement>(null)
  const ref = buttonRef ?? ownRef
  const dismiss = useCoach((s) => s.dismiss)
  return (
    <>
      <button
        ref={ref}
        type="button"
        className="iconbox icobtn"
        style={{ position: 'relative' }}
        aria-label={t('notebook.title')}
        onClick={() => {
          dismiss('notes')
          onClick()
        }}
      >
        <NotebookIcon />
        {count > 0 ? (
          <span aria-hidden="true" style={BADGE_STYLE}>
            {count}
          </span>
        ) : null}
      </button>
      {tip ? (
        <Bubble anchor={ref} side="above" onDismiss={() => dismiss('notes')} testId="coach-notes">
          <Trans i18nKey="coach.notes" components={{ b: <strong /> }} />
        </Bubble>
      ) : null}
    </>
  )
}
