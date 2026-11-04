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

/** `POST /api/me/ping`: sent about once a minute while the app is open and visible. */
export const PresencePing = z.object({ activity: ActivitySchema })
export type PresencePing = z.infer<typeof PresencePing>
