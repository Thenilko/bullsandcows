import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from '../features/auth/session'
import { startSupabaseSync } from '../features/auth/SupabaseSession'
import { syncMuted } from '../lib/sound'
import '../i18n'

/** Side effects tied to the signed-in user: sound preference and token refresh. */
function useSessionEffects() {
  const sound = useSession((s) => s.me?.profile.sound)
  useEffect(() => syncMuted(sound), [sound])
  useEffect(() => {
    void startSupabaseSync()
  }, [])
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  useSessionEffects()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
