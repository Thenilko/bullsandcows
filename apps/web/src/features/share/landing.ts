import { postShareLanding } from './api'

const SHARE_PARAM = 's'
const SHARE_VALUE = 'share'

/**
 * A page opened through `?s=share` is reported once (spec A §7): fire-and-forget, failures ignored,
 * no other behaviour. Returns whether the request was sent.
 */
export function logShareLanding(search: string, post: () => Promise<unknown> = postShareLanding): boolean {
  if (new URLSearchParams(search).get(SHARE_PARAM) !== SHARE_VALUE) return false
  void post().catch(() => undefined)
  return true
}
