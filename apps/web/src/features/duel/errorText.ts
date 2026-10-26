import type { ErrorCode } from '@bc/protocol'
import type { TFunction } from 'i18next'

/** Translates a server error code; `ERR_CODE` needs the expected digit count. */
export function errorText(t: TFunction, code: ErrorCode, len: number): string {
  return t(`error.${code}`, { count: len })
}
