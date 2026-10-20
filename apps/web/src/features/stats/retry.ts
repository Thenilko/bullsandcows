import { ApiError } from '../../lib/api'

const MAX_RETRIES = 2

/** Client errors (4xx) are final; network and server hiccups get a couple of retries. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < MAX_RETRIES
}
