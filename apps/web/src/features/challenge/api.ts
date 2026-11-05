import type {
  ChallengeStatusDto,
  CreateChallengeBody,
  CreatedChallengeDto,
  IncomingChallengesDto,
  JoinInviteDto,
} from '@bc/protocol'
import { api } from '../auth/client'

const path = (id: string, action = ''): string =>
  `/api/challenges/${encodeURIComponent(id)}${action ? `/${action}` : ''}`

/** The query of the member's incoming challenges (the inbox card and the in-game banner). */
export const INBOX_KEY = ['challenges', 'incoming'] as const

export const challengeApi = {
  create: (body: CreateChallengeBody) => api.post<CreatedChallengeDto>('/api/challenges', body),
  incoming: () => api.get<IncomingChallengesDto>('/api/challenges/incoming'),
  status: (id: string) => api.get<ChallengeStatusDto>(path(id)),
  accept: (id: string) => api.post<JoinInviteDto>(path(id, 'accept')),
  later: (id: string) => api.post<ChallengeStatusDto>(path(id, 'later')),
  decline: (id: string) => api.post<ChallengeStatusDto>(path(id, 'decline')),
  cancel: (id: string) => api.post<ChallengeStatusDto>(path(id, 'cancel')),
}
