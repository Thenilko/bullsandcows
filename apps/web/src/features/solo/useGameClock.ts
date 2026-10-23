import type { GameViewDto } from '@bc/protocol'
import { useEffect, useState } from 'react'
import { mismatches } from './derive'

/** Whole seconds since `startedAt`, ticking once a second while `running`. */
export function useElapsed(startedAt: number | null, running: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])
  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000))
}

/** Dev-only: the client replay of the verdicts must agree with the server (the server wins). */
export function useSanityCheck(game: GameViewDto | undefined): void {
  useEffect(() => {
    if (!import.meta.env.DEV || !game) return
    const bad = mismatches(game.len, game.zero, game.guesses)
    if (bad.length > 0) console.warn('[solo] client replay differs from server verdicts at', bad)
  }, [game])
}
