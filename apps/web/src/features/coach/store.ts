import { create } from 'zustand'

/** Bump the version to show the tips again after they change. */
export const COACH_KEY = 'bc.coach.v1'

/** `notes`: the notebook button, once the game has started; `board`: the attempts board after the first verdict. */
export type CoachTip = 'notes' | 'board'

function readSeen(): ReadonlySet<CoachTip> {
  try {
    const raw = window.localStorage.getItem(COACH_KEY)
    return new Set(raw ? (JSON.parse(raw) as CoachTip[]) : [])
  } catch {
    // Blocked or broken storage: better no tips than tips in every game.
    return new Set<CoachTip>(['notes', 'board'])
  }
}

interface CoachState {
  seen: ReadonlySet<CoachTip>
  dismiss(tip: CoachTip): void
}

/** The game-screen tips, each shown once per device. */
export const useCoach = create<CoachState>()((set, get) => ({
  seen: readSeen(),
  dismiss: (tip) => {
    if (get().seen.has(tip)) return
    const seen = new Set([...get().seen, tip])
    try {
      window.localStorage.setItem(COACH_KEY, JSON.stringify([...seen]))
    } catch {
      // Not remembered: the tip shows again next time.
    }
    set({ seen })
  },
}))

/** Which tip is due now: the notebook one first, then the board once there is an attempt. */
export function dueTip(
  seen: ReadonlySet<CoachTip>,
  started: boolean,
  attempts: number,
): CoachTip | null {
  if (!started) return null
  if (!seen.has('notes')) return 'notes'
  if (attempts > 0 && !seen.has('board')) return 'board'
  return null
}

/** The tip due for this game right now, from the shared store. */
export function useDueTip(started: boolean, attempts: number): CoachTip | null {
  const seen = useCoach((s) => s.seen)
  return dueTip(seen, started, attempts)
}
