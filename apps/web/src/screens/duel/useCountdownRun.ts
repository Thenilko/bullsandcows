import { useEffect, useState } from 'react'

export const COUNTDOWN_TOTAL_MS = 2100

/**
 * True once the 3-2-1 sequence should be on screen, so that "start" lands on `startAt`.
 * The server decides when play starts; this only draws the 3-2-1 leading up to it.
 */
export function useCountdownRun(startAt: number | null): boolean {
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (startAt === null) return
    const wait = startAt - COUNTDOWN_TOTAL_MS - Date.now()
    const id = setTimeout(() => setRunning(true), Math.max(0, wait))
    return () => clearTimeout(id)
  }, [startAt])
  return startAt !== null && running
}
