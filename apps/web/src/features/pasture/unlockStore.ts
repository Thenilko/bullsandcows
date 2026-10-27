import type { PastureKey } from '@bc/protocol'
import { create } from 'zustand'

export interface UnlockStore {
  /** Rewards unlocked and not yet announced, in the order they arrived; the first one is on screen. */
  queue: readonly PastureKey[]
  push(keys: readonly PastureKey[] | undefined): void
  /** The one on screen is done („Сложи го в пасището“ or „По-късно“). */
  next(): void
  clear(): void
}

/** „Ниво N · ново в пасището“ modals, one after another, after the badge toasts (the host lives in the app root). */
export const useUnlocks = create<UnlockStore>()((set) => ({
  queue: [],
  push: (keys) => {
    if (!keys || keys.length === 0) return
    set((s) => ({ queue: [...s.queue, ...keys.filter((k) => !s.queue.includes(k))] }))
  },
  next: () => set((s) => ({ queue: s.queue.slice(1) })),
  clear: () => set({ queue: [] }),
}))
