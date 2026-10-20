import { ServerMsg, type ClientMsg } from '@bc/protocol'
import { useCallback, useEffect, useRef } from 'react'
import { connectRealtime, type Realtime, type RealtimeStatus } from '../../lib/realtime'
import { useSession } from '../auth/session'
import { useDuelStore } from './store'

export const ROOM_KEY = 'bc.room'

export interface StoredRoom {
  roomId: string
  token: string
}

export function readStoredRoom(): StoredRoom | null {
  try {
    const raw = sessionStorage.getItem(ROOM_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<StoredRoom>
    return typeof v.roomId === 'string' && typeof v.token === 'string' ? { roomId: v.roomId, token: v.token } : null
  } catch {
    return null
  }
}

function storeRoom(room: StoredRoom): void {
  try {
    sessionStorage.setItem(ROOM_KEY, JSON.stringify(room))
  } catch {
    // reload recovery is a convenience only
  }
}

export function clearRoomSession(): void {
  try {
    sessionStorage.removeItem(ROOM_KEY)
  } catch {
    // nothing to clear
  }
}

const currentJwt = (): string => useSession.getState().session?.accessToken ?? ''

export interface RoomApi {
  state: ReturnType<typeof useDuelStore.getState>['state']
  status: RealtimeStatus
  send(msg: ClientMsg): void
}

/** Opens the duel socket for a seat; the server answers with a full `state` snapshot. */
export function useRoom(roomId: string, token: string): RoomApi {
  const rtRef = useRef<Realtime<ServerMsg, ClientMsg> | null>(null)
  const state = useDuelStore((s) => s.state)
  const status = useDuelStore((s) => s.status)

  useEffect(() => {
    const store = useDuelStore.getState()
    store.enter(roomId)
    storeRoom({ roomId, token })
    const rt = connectRealtime<ServerMsg, ClientMsg>(`/ws/duel/${encodeURIComponent(roomId)}`, { token, jwt: currentJwt }, ServerMsg)
    rtRef.current = rt
    const offMsg = rt.on((m) => useDuelStore.getState().apply(m))
    const offStatus = rt.onStatus((s) => useDuelStore.getState().setStatus(s))
    return () => {
      offMsg()
      offStatus()
      rt.close()
      rtRef.current = null
    }
  }, [roomId, token])

  const send = useCallback((msg: ClientMsg) => rtRef.current?.send(msg), [])
  return { state, status, send }
}
