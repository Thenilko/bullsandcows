/** Postgres `unique_violation`; the memory repo throws the same code for the same cases. */
export const UNIQUE_VIOLATION = '23505'

interface CodedError {
  readonly code?: unknown
  readonly cause?: unknown
}

/** True for a unique-constraint violation, also when wrapped (Drizzle puts it in `cause`). */
export function isDuplicate(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as CodedError
  return e.code === UNIQUE_VIOLATION || isDuplicate(e.cause)
}

export const duplicateError = (what: string): Error =>
  Object.assign(new Error(`duplicate ${what}`), { code: UNIQUE_VIOLATION })
