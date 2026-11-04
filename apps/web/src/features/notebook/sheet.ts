import { create } from 'zustand'

interface NotesSheetState {
  open: boolean
  show(): void
  hide(): void
}

/**
 * Whether the phone notebook sheet is open. Shared so both the notebook button in the panel and the attempts
 * board over the pasture can open it.
 */
export const useNotesSheet = create<NotesSheetState>()((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}))
