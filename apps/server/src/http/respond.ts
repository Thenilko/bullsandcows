import { apiErr, apiOk, type ErrorCode } from '@bc/protocol'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export const ok = <T>(c: Context, data: T, status: ContentfulStatusCode = 200) =>
  c.json(apiOk(data), status)

export const fail = (c: Context, code: ErrorCode, status: ContentfulStatusCode) =>
  c.json(apiErr(code), status)
