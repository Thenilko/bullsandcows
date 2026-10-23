import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from '../features/auth/session'
import { startSupabaseSync } from '../features/auth/SupabaseSession'
import { syncMuted } from '../lib/sound'
import { startAmbientPause } from './ambientPause'
import '../i18n'

/** App-wide side effects: sound preference, token refresh, and the idle pause of the scene's ambient loops. */
function useSessionEffects() {
  const sound = useSession((s) => s.me?.profile.sound)
  useEffect(() => syncMuted(sound), [sound])
  useEffect(() => {
    void startSupabaseSync()
  }, [])
  useEffect(() => startAmbientPause(), [])
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  useSessionEffects()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
