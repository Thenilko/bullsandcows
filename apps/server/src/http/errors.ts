import type { ErrorCode } from '@bc/protocol'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

/** An expected failure that the API maps to `{ ok: false, error: { code } }` with `status`. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: ContentfulStatusCode,
  ) {
    super(code)
    this.name = 'AppError'
  }
}
