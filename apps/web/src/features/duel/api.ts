import type {
  BotRoomDto,
  CreateBotBody,
  CreateInviteBody,
  InviteDto,
  InviteInfoDto,
  JoinInviteDto,
} from '@bc/protocol'
import { api } from '../auth/client'

const code = (c: string): string => encodeURIComponent(c)

export const duelApi = {
  createInvite: (body: CreateInviteBody) => api.post<InviteDto>('/api/duels/invites', body),
  inviteInfo: (c: string) => api.get<InviteInfoDto>(`/api/duels/invites/${code(c)}`),
  joinInvite: (c: string) => api.post<JoinInviteDto>(`/api/duels/invites/${code(c)}/join`),
  createBot: (body: CreateBotBody) => api.post<BotRoomDto>('/api/bots', body),
}

const INVITE_KEY = 'bc.invite'

/** The host's invite; a leaderboard challenge also carries its id and the challenged player's name. */
export type HostInvite = InviteDto & { challengeId?: string; toUsername?: string }

const challengePart = (v: Partial<HostInvite>): Pick<HostInvite, 'challengeId' | 'toUsername'> =>
  typeof v.challengeId === 'string' && typeof v.toUsername === 'string'
    ? { challengeId: v.challengeId, toUsername: v.toUsername }
    : {}

/** The host's own invite, kept so the waiting screen survives a reload. */
export function saveInvite(invite: HostInvite): void {
  try {
    sessionStorage.setItem(INVITE_KEY, JSON.stringify(invite))
  } catch {
    // reload recovery is a convenience only
  }
}

export function readInvite(codeValue: string): HostInvite | null {
  try {
    const raw = sessionStorage.getItem(INVITE_KEY)
    const v = raw ? (JSON.parse(raw) as Partial<HostInvite>) : null
    if (!v || v.code !== codeValue) return null
    return typeof v.url === 'string' && typeof v.roomId === 'string' && typeof v.token === 'string'
      ? { code: v.code, url: v.url, roomId: v.roomId, token: v.token, ...challengePart(v) }
      : null
  } catch {
    return null
  }
}

export function clearInvite(): void {
  try {
    sessionStorage.removeItem(INVITE_KEY)
  } catch {
    // nothing to clear
  }
}

/** Where a seat token lands: the room reads and then strips it from the address bar. */
export function roomPath(roomId: string, token: string): string {
  return `/duel/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`
}
