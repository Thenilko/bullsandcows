import { QueueServerMsg, type DuelFormat, type QueueClientMsg } from '@bc/protocol'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNow } from '../../hooks/useNow'
import { connectRealtime } from '../../lib/realtime'
import { useSession } from '../auth/session'

export interface QueueOptions {
  len: 3 | 4 | 5
  zero: boolean
  format: DuelFormat
}

export type QueueError = 'guest' | 'closed' | 'server'

export interface QueueApi {
  elapsedMs: number
  suggestInvite: boolean
  matched: { roomId: string; token: string } | null
  error: QueueError | null
  leave(): void
}

interface Waiting {
  baseMs: number
  at: number
}

/** Joins the quick-match queue; guests never connect (the server would answer 403). */
export function useQueue({ len, zero, format }: QueueOptions): QueueApi {
  const isGuest = useSession((s) => s.session?.user.isGuest ?? false)
  const stopRef = useRef<(() => void) | null>(null)
  const [waiting, setWaiting] = useState<Waiting>(() => ({ baseMs: 0, at: Date.now() }))
  const [suggestInvite, setSuggestInvite] = useState(false)
  const [matched, setMatched] = useState<QueueApi['matched']>(null)
  const [remoteError, setRemoteError] = useState<QueueError | null>(null)
  const now = useNow(250, !matched)

  useEffect(() => {
    if (isGuest) return
    const rt = connectRealtime<QueueServerMsg, QueueClientMsg>('/ws/queue', { jwt: () => useSession.getState().session?.accessToken ?? '' }, QueueServerMsg)
    rt.send({ t: 'join', len, zero, format })
    const offMsg = rt.on((m) => {
      if (m.t === 'waiting') {
        setWaiting({ baseMs: m.elapsedMs, at: Date.now() })
        setSuggestInvite(m.suggestInvite)
      } else if (m.t === 'matched') setMatched({ roomId: m.roomId, token: m.token })
      else setRemoteError('server')
    })
    const offStatus = rt.onStatus((s) => {
      if (s === 'closed') setRemoteError((e) => e ?? 'closed')
    })
    const stop = () => {
      offMsg()
      offStatus()
      rt.close()
    }
    stopRef.current = stop
    return () => {
      stop()
      stopRef.current = null
    }
  }, [isGuest, len, zero, format])

  const leave = useCallback(() => stopRef.current?.(), [])
  const elapsedMs = waiting.baseMs + Math.max(0, now - waiting.at)
  return { elapsedMs, suggestInvite, matched, error: isGuest ? 'guest' : remoteError, leave }
}
