import { z } from 'zod'

/** What the player has open, derived from the route by the client; only the admin sees it. */
export const ActivitySchema = z.enum([
  'home',
  'setup',
  'play',
  'result',
  'duel',
  'queue',
  'invite',
  'weekly',
  'board',
  'profile',
  'farm',
  'rules',
  'other',
])
export type Activity = z.infer<typeof ActivitySchema>

/** In a game, a duel or matchmaking: a challenge waits as a slim banner instead of the full card. */
export const BUSY_ACTIVITIES: readonly Activity[] = ['play', 'duel', 'queue']
export const isBusyActivity = (activity: Activity | null | undefined): boolean =>
  activity != null && BUSY_ACTIVITIES.includes(activity)

/** `POST /api/me/ping`: sent about once a minute while the app is open and visible. */
export const PresencePing = z.object({ activity: ActivitySchema })
export type PresencePing = z.infer<typeof PresencePing>
