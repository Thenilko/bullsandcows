import { isValidCode, type Len } from '@bc/game-core'
import type { Context } from 'hono'
import { AppError } from './errors'
import type { AppEnv } from './types'

const TEST_SECRET_HEADER = 'x-test-secret'

/**
 * The E2E secret override exists only in dev and test; elsewhere the header is never read.
 * A present but invalid code for the settings is `ERR_CODE`.
 */
export function testSecret(c: Context<AppEnv>, len: Len, zero: boolean): string | undefined {
  const { ENVIRONMENT } = c.get('deps').env
  if (ENVIRONMENT !== 'dev' && ENVIRONMENT !== 'test') return undefined
  const secret = c.req.header(TEST_SECRET_HEADER)
  if (secret !== undefined && !isValidCode(secret, len, zero)) throw new AppError('ERR_CODE', 400)
  return secret
}
