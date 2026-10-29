import { create } from 'zustand'

/** Set once the visitor finished or skipped the tour on this device; bump the version to show a new tour. */
export const ONBOARDING_KEY = 'bc.onboarding.v1'

/** Pages that open on their own (legal texts, the reset link, the dev gallery): no tour over them. */
const QUIET_PREFIXES = ['/dev', '/privacy', '/terms', '/legal', '/changelog', '/support', '/story', '/reset'] as const

/** True when the tour was seen, or when storage is blocked (better no tour than one on every visit). */
export function onboardingSeen(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) !== null
  } catch {
    return true
  }
}

function markSeen(): void {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, new Date().toISOString())
  } catch {
    // Blocked storage: the tour simply shows again next time.
  }
}

export const isQuietPath = (pathname: string): boolean =>
  QUIET_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

interface OnboardingState {
  open: boolean
  /** 0 is the welcome card („Покажи ми“ / „Пропусни“); 1… are the tour steps. */
  step: number
  /** Opens the tour; the „Правила“ page replays it from the first step. */
  show(step?: number): void
  go(step: number): void
  /** Skip, finish, Escape or the backdrop: remembered so the tour does not come back. */
  close(): void
}

export const useOnboarding = create<OnboardingState>()((set) => ({
  open: false,
  step: 0,
  show: (step = 0) => set({ open: true, step }),
  go: (step) => set({ step }),
  close: () => {
    markSeen()
    set({ open: false, step: 0 })
  },
}))

/** Opens the welcome card on the first visit of this device, unless the page is a quiet one. */
export function openOnFirstVisit(pathname: string): void {
  if (!onboardingSeen() && !isQuietPath(pathname)) useOnboarding.getState().show(0)
}
