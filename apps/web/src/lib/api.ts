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
}

export interface ApiOptions {
  /** Called on any 401 so the session store can clear itself. */
  onUnauthorized?: () => void
}

type Method = 'GET' | 'POST' | 'PATCH'

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
  async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetchImpl(path, buildInit(method, getToken(), body))
    } catch {
      throw new ApiError('ERR_INTERNAL', 0)
    }
    if (res.status === 401) options.onUnauthorized?.()
    const env = await readEnvelope<T>(res)
    if (!env.ok) throw new ApiError(env.error.code, res.status)
    return env.data
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
  }
}
