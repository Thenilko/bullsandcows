import { AppError } from '../../../http/errors'

const UNIQUE_VIOLATION = '23505'

interface PgErrorLike {
  readonly code?: unknown
  readonly constraint_name?: unknown
  readonly cause?: unknown
}

/** postgres.js errors may arrive wrapped by Drizzle (`cause`). */
function pgError(err: unknown): PgErrorLike | null {
  if (typeof err !== 'object' || err === null) return null
  const e = err as PgErrorLike
  if (e.code === UNIQUE_VIOLATION) return e
  return e.cause ? pgError(e.cause) : null
}

export function isUniqueViolation(err: unknown, constraint: string): boolean {
  return pgError(err)?.constraint_name === constraint
}

export function required<T>(row: T | undefined): T {
  if (row === undefined) throw new AppError('ERR_NOT_FOUND', 404)
  return row
}
