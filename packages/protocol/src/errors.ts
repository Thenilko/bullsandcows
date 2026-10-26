/** Server error codes; the client translates them via the i18n `error.*` keys. */
export const ERROR_CODES = [
  'ERR_AUTH',
  'ERR_GUEST',
  'ERR_INPUT',
  'ERR_CODE',
  'ERR_NOT_FOUND',
  'ERR_NOT_STARTED',
  'ERR_FINISHED',
  'ERR_REPEAT',
  'ERR_NOT_YOUR_TURN',
  'ERR_USERNAME_TAKEN',
  'ERR_CREDENTIALS',
  'ERR_INVITE_EXPIRED',
  'ERR_ROOM_FULL',
  'ERR_RATE_LIMIT',
  'ERR_FARM_FULL',
  'ERR_FARM_CODE',
  'ERR_ALREADY_IN_FARM',
  'ERR_FORBIDDEN',
  'ERR_INTERNAL',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode } }

export const isErrorCode = (value: unknown): value is ErrorCode =>
  typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value)

export const apiOk = <T>(data: T): ApiResult<T> => ({ ok: true, data })

export const apiErr = (code: ErrorCode): { ok: false; error: { code: ErrorCode } } => ({
  ok: false,
  error: { code },
})
