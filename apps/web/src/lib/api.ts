import { isErrorCode, type ApiResult, type ErrorCode } from '@bc/protocol'

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
  ) {
    super(code)
    this.name = 'ApiError'
  }
}

export interface ApiClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  del<T>(path: string): Promise<T>
}

/** `refreshed`: retry with the new token; `invalid`: the session is over; `unavailable`: try later. */
export type RefreshResult = 'refreshed' | 'invalid' | 'unavailable'

export interface ApiOptions {
  /** Called when a 401 cannot be cured by a refresh, so the session store can clear itself. */
  onUnauthorized?: () => void
  /** Awaited before every request (renews a token that is about to expire); failures are ignored. */
  beforeRequest?: () => Promise<void>
  /** One renewal attempt after a 401 outside `/api/auth/*`. Without it a 401 clears at once. */
  refresh?: () => Promise<RefreshResult>
}

/** Auth endpoints answer 401 for wrong credentials or tokens they were sent; that ends no session. */
const isAuthPath = (path: string) => path.startsWith('/api/auth/')

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

function buildInit(method: Method, token: string | null, body: unknown): RequestInit {
  const headers = new Headers()
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (body === undefined) return { method, headers }
  headers.set('content-type', 'application/json')
  return { method, headers, body: JSON.stringify(body) }
}

async function readEnvelope<T>(res: Response): Promise<ApiResult<T>> {
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new ApiError('ERR_INTERNAL', res.status)
  }
  const env = json as Partial<{ ok: boolean; data: T; error: { code: unknown } }> | null
  if (env?.ok === true) return { ok: true, data: env.data as T }
  const code = env?.error?.code
  return { ok: false, error: { code: isErrorCode(code) ? code : 'ERR_INTERNAL' } }
}

export function createApi(
  getToken: () => string | null,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
  options: ApiOptions = {},
): ApiClient {
  async function send(method: Method, path: string, body: unknown): Promise<Response> {
    try {
      return await fetchImpl(path, buildInit(method, getToken(), body))
    } catch {
      throw new ApiError('ERR_INTERNAL', 0)
    }
  }

  /** After a 401: one refresh and one retry; clears only when the session is really over. */
  async function renew(rejected: Response, method: Method, path: string, body: unknown): Promise<Response> {
    const outcome: RefreshResult = options.refresh
      ? await options.refresh().catch((): RefreshResult => 'unavailable')
      : 'invalid'
    if (outcome === 'invalid') options.onUnauthorized?.()
    if (outcome !== 'refreshed') return rejected
    const retry = await send(method, path, body)
    if (retry.status === 401) options.onUnauthorized?.()
    return retry
  }

  async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    await options.beforeRequest?.().catch(() => undefined)
    let res = await send(method, path, body)
    if (res.status === 401 && !isAuthPath(path)) res = await renew(res, method, path, body)
    const env = await readEnvelope<T>(res)
    if (!env.ok) throw new ApiError(env.error.code, res.status)
    return env.data
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    del: (path) => request('DELETE', path),
  }
}
