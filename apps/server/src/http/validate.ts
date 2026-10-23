import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'
import { fail } from './respond'

/** Zod validation for a request part; any failure becomes 400 `ERR_INPUT`. */
export const validate = <Target extends keyof ValidationTargets, Schema extends ZodType>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) return fail(c, 'ERR_INPUT', 400)
  })
