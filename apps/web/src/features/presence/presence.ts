import type { Activity } from '@bc/protocol'
import { api } from '../auth/client'
import { useSession } from '../auth/session'

/** One ping a minute while the tab is visible; the admin counts a player online for three. */
export const PING_MS = 60_000
/** A route change pings at once, but not more often than this. */
const MIN_GAP_MS = 10_000

const RULES: readonly [RegExp, Activity][] = [
  [/^\/$/, 'home'],
  [/^\/(new|duel\/new|bot\/new)$/, 'setup'],
  [/^\/(play\/|weekly\/play$)/, 'play'],
  [/^\/result\//, 'result'],
  [/^\/duel\/queue$/, 'queue'],
  [/^\/(duel\/invite\/|d\/)/, 'invite'],
  [/^\/duel\/[^/]+(\/result)?$/, 'duel'],
  [/^\/(weekly|today)(\/|$)/, 'weekly'],
  [/^\/board$/, 'board'],
  [/^\/profile(\/|$)/, 'profile'],
  [/^\/(farm|ferma)(\/|$)/, 'farm'],
  [/^\/rules$/, 'rules'],
]

/** What the player has open, from the path alone (room ids and invite codes are never sent). */
export function activityOf(pathname: string): Activity {
  return RULES.find(([re]) => re.test(pathname))?.[1] ?? 'other'
}

interface Location {
  readonly pathname: string
}

interface RouterLike {
  readonly state: { readonly location: Location }
  subscribe(fn: (state: { location: Location }) => void): () => void
}

/**
 * Tells the server who is in the app and where, for the admin's „Онлайн сега“: on start, on a route
 * change and every minute while visible. Signed-out visitors send nothing; a failed ping is dropped.
 */
export function startPresence(router: RouterLike): () => void {
  let last = 0
  let path = router.state.location.pathname

  const ping = (force: boolean) => {
    const now = Date.now()
    if (!useSession.getState().session || document.visibilityState !== 'visible') return
    if (!force && now - last < MIN_GAP_MS) return
    last = now
    api.post('/api/me/ping', { activity: activityOf(path) }).catch(() => undefined)
  }

  const unsubscribe = router.subscribe((state) => {
    if (state.location.pathname === path) return
    path = state.location.pathname
    ping(false)
  })
  const timer = window.setInterval(() => ping(true), PING_MS)
  const onVisible = () => ping(false)
  document.addEventListener('visibilitychange', onVisible)
  ping(true)

  return () => {
    unsubscribe()
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
