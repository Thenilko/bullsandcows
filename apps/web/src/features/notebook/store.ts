import { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import type { DigitMark } from '../../components/ui'
import { sfx } from '../../lib/sound'

export type Marks = Readonly<Record<string, DigitMark>>

export interface GameNotes {
  marks: Marks
  text: string
}

export interface NotebookState {
  marks: Marks
  text: string
  /** 0 -> 1 ("not in the number") -> 2 ("in the number") -> 0. */
  cycle(d: string): void
  setText(t: string): void
  clearMarks(): void
}

const EMPTY: GameNotes = { marks: {}, text: '' }
const KEY_PREFIX = 'bc.notebook.'

function isMark(v: unknown): v is DigitMark {
  return v === 1 || v === 2
}

function parse(raw: string | null): GameNotes {
  if (raw === null) return EMPTY
  try {
    const data = JSON.parse(raw) as { marks?: Record<string, unknown>; text?: unknown }
    const marks = Object.fromEntries(Object.entries(data.marks ?? {}).filter(([, v]) => isMark(v))) as Marks
    return { marks, text: typeof data.text === 'string' ? data.text : '' }
  } catch {
    return EMPTY
  }
}

function readStored(id: string): GameNotes {
  try {
    return parse(localStorage.getItem(KEY_PREFIX + id))
  } catch {
    return EMPTY
  }
}

function writeStored(id: string, notes: GameNotes): void {
  try {
    localStorage.setItem(KEY_PREFIX + id, JSON.stringify(notes))
  } catch {
    // storage is unavailable (private mode, quota): the notebook then lives in memory only
  }
}

function nextMarks(marks: Marks, d: string): Marks {
  const next = ((marks[d] ?? 0) + 1) % 3
  const rest = Object.fromEntries(Object.entries(marks).filter(([k]) => k !== d)) as Marks
  return next === 0 ? rest : { ...rest, [d]: next as DigitMark }
}

interface NotebookStore {
  games: Readonly<Record<string, GameNotes>>
  hydrate(id: string): void
  cycle(id: string, d: string): void
  setText(id: string, text: string): void
  clearMarks(id: string): void
}

export const useNotebookStore = create<NotebookStore>()((set, get) => {
  const update = (id: string, change: (n: GameNotes) => GameNotes) => {
    const next = change(get().games[id] ?? readStored(id))
    writeStored(id, next)
    set((s) => ({ games: { ...s.games, [id]: next } }))
  }
  return {
    games: {},
    hydrate: (id) => {
      if (get().games[id]) return
      set((s) => ({ games: { ...s.games, [id]: readStored(id) } }))
    },
    cycle: (id, d) => {
      sfx.play('page')
      update(id, (n) => ({ ...n, marks: nextMarks(n.marks, d) }))
    },
    setText: (id, text) => update(id, (n) => ({ ...n, text })),
    clearMarks: (id) => update(id, (n) => ({ ...n, marks: {} })),
  }
})

/** Marks and free notes of one game, persisted per game in localStorage. */
export function useNotebook(gameId: string): NotebookState {
  const notes = useNotebookStore((s) => s.games[gameId]) ?? EMPTY
  useEffect(() => useNotebookStore.getState().hydrate(gameId), [gameId])
  return {
    marks: notes.marks,
    text: notes.text,
    cycle: useCallback((d) => useNotebookStore.getState().cycle(gameId, d), [gameId]),
    setText: useCallback((t) => useNotebookStore.getState().setText(gameId, t), [gameId]),
    clearMarks: useCallback(() => useNotebookStore.getState().clearMarks(gameId), [gameId]),
  }
}

/** Whether the notebook of a game was used at all (a mark or some text), from the store or the storage. */
export function hasNotes(gameId: string): boolean {
  return countNotes(useNotebookStore.getState().games[gameId] ?? readStored(gameId)) > 0
}

/** Badge count on the notebook button: marked digits plus one when there is free text. */
export function countNotes(n: Pick<NotebookState, 'marks' | 'text'>): number {
  return Object.keys(n.marks).length + (n.text ? 1 : 0)
}
