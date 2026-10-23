import type { ErrorCode } from '@bc/protocol'
import { isErrorCode } from '@bc/protocol'
import { ApiError } from '../../lib/api'
import type { UiError } from './store'

export const gameKey = (id: string) => ['game', id] as const

export function toUiError(e: unknown): UiError {
  if (!(e instanceof ApiError)) return 'ERR_INTERNAL'
  if (e.status === 0) return 'NETWORK'
  if (e.status === 429) return 'ERR_RATE_LIMIT'
  const code: ErrorCode = isErrorCode(e.code) ? e.code : 'ERR_INTERNAL'
  return code
}
