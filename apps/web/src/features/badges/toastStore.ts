import type { NewBadgeDto } from '@bc/protocol'
import { create } from 'zustand'

export interface BadgeToastStore {
  /** Tiers earned and not yet shown, in the order they arrived; the first one is on screen. */
  queue: readonly NewBadgeDto[]
  /** Increments with every badge that reaches the screen, to replay the entrance animation. */
  shown: number
  push(badges: readonly NewBadgeDto[] | undefined): void
  /** The one on screen is done (timed out, dismissed or opened). */
  next(): void
  clear(): void
}

/** „Нова значка!“ toasts, one after another, across route changes (the host lives in the app root). */
export const useBadgeToasts = create<BadgeToastStore>()((set) => ({
  queue: [],
  shown: 0,
  push: (badges) => {
    if (!badges || badges.length === 0) return
    set((s) => ({ queue: [...s.queue, ...badges], shown: s.queue.length === 0 ? s.shown + 1 : s.shown }))
  },
  next: () =>
    set((s) => {
      const queue = s.queue.slice(1)
      return { queue, shown: queue.length > 0 ? s.shown + 1 : s.shown }
    }),
  clear: () => set({ queue: [] }),
}))
