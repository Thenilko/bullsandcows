import type { AuthResponseDto, MeDto, SessionDto } from '@bc/protocol'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const SESSION_STORAGE_KEY = 'bc.session'

export interface SessionState {
  session: SessionDto | null
  me: MeDto | null
  setAuth(res: AuthResponseDto): void
  setMe(me: MeDto): void
  /** Replaces only the token fields (used by the refresh flow). */
  setTokens(tokens: Pick<SessionDto, 'accessToken' | 'refreshToken' | 'expiresAt'>): void
  clear(): void
}

/** localStorage that never throws (private mode, blocked storage). */
const safeStorage = createJSONStorage<Pick<SessionState, 'session' | 'me'>>(() => ({
  getItem: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      // storage may be unavailable
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      // storage may be unavailable
    }
  },
}))

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      me: null,
      setAuth: (res) => set({ session: res.session, me: res.me }),
      setMe: (me) => set({ me }),
      setTokens: (tokens) => set((s) => (s.session ? { session: { ...s.session, ...tokens } } : s)),
      clear: () => set({ session: null, me: null }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      storage: safeStorage,
      partialize: (s) => ({ session: s.session, me: s.me }),
    },
  ),
)
