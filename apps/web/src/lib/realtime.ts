/** The slice of a zod schema the client needs; keeps `zod` out of the web dependencies. */
export interface MessageSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false }
}

export type RealtimeStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export interface Realtime<ServerT, ClientT> {
  send(msg: ClientT): void
  on(handler: (m: ServerT) => void): () => void
  /** Fires on every status change, including the final `closed`. */
  onStatus(handler: (s: RealtimeStatus) => void): () => void
  close(): void
  readonly status: RealtimeStatus
}

export interface RealtimeOptions {
  /** Seat token for a duel room; absent for the queue. */
  token?: string
  /** Access token, or a getter so reconnects pick up a refreshed one. */
  jwt: string | (() => string)
  maxReconnectMs?: number
}

const DEFAULT_MAX_RECONNECT_MS = 30_000
const BASE_DELAY_MS = 500
const MAX_DELAY_MS = 4000

export function backoffDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS)
}

export function buildSocketUrl(path: string, jwt: string, token?: string): string {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const query = `?auth=${encodeURIComponent(jwt)}${token ? `&token=${encodeURIComponent(token)}` : ''}`
  return `${scheme}//${location.host}${path}${query}`
}

function warnInvalid(reason: string): void {
  if (import.meta.env.DEV) console.warn(`[realtime] ignored invalid message: ${reason}`)
}

class Connection<ServerT, ClientT> implements Realtime<ServerT, ClientT> {
  private readonly handlers = new Set<(m: ServerT) => void>()
  private readonly statusHandlers = new Set<(s: RealtimeStatus) => void>()
  private readonly outbox: string[] = []
  private socket: WebSocket | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private attempt = 0
  private failingSince: number | null = null
  private stopped = false
  private current: RealtimeStatus = 'connecting'

  constructor(
    private readonly path: string,
    private readonly opts: RealtimeOptions,
    private readonly schema: MessageSchema<ServerT>,
  ) {
    this.open()
  }

  get status(): RealtimeStatus {
    return this.current
  }

  send(msg: ClientT): void {
    this.outbox.push(JSON.stringify(msg))
    if (this.current === 'open') this.flush()
  }

  on(handler: (m: ServerT) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onStatus(handler: (s: RealtimeStatus) => void): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  close(): void {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const ws = this.socket
    this.socket = null
    ws?.close()
    this.setStatus('closed')
  }

  private setStatus(next: RealtimeStatus): void {
    if (this.current === next) return
    this.current = next
    this.statusHandlers.forEach((h) => h(next))
  }

  private parse(raw: unknown): void {
    let json: unknown
    try {
      json = JSON.parse(String(raw))
    } catch {
      warnInvalid('not JSON')
      return
    }
    const res = this.schema.safeParse(json)
    if (!res.success) {
      warnInvalid('schema mismatch')
      return
    }
    this.handlers.forEach((h) => h(res.data))
  }

  private flush(): void {
    while (this.socket && this.outbox.length > 0) this.socket.send(this.outbox.shift() as string)
  }

  private scheduleReconnect(): void {
    const now = Date.now()
    this.failingSince ??= now
    const remaining = this.failingSince + (this.opts.maxReconnectMs ?? DEFAULT_MAX_RECONNECT_MS) - now
    if (remaining <= 0) {
      this.setStatus('closed')
      return
    }
    this.setStatus('reconnecting')
    const delay = Math.min(backoffDelay(this.attempt), remaining)
    this.attempt += 1
    this.timer = setTimeout(() => this.open(), delay)
  }

  private open(): void {
    this.timer = null
    const jwt = typeof this.opts.jwt === 'function' ? this.opts.jwt() : this.opts.jwt
    const ws = new WebSocket(buildSocketUrl(this.path, jwt, this.opts.token))
    this.socket = ws
    ws.onopen = () => {
      this.attempt = 0
      this.failingSince = null
      this.setStatus('open')
      this.flush()
    }
    ws.onmessage = (e) => this.parse(e.data)
    ws.onclose = () => {
      if (this.socket !== ws) return
      this.socket = null
      if (!this.stopped) this.scheduleReconnect()
    }
  }
}

export function connectRealtime<ServerT, ClientT>(
  path: string,
  opts: RealtimeOptions,
  schema: MessageSchema<ServerT>,
): Realtime<ServerT, ClientT> {
  return new Connection<ServerT, ClientT>(path, opts, schema)
}
