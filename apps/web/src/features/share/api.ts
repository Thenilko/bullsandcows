import type { ShareBody, ShareLandingDto, ShareResultDto } from '@bc/protocol'
import { api } from '../auth/client'

/** `POST /api/shares`: a shared game for the „teller“ badge (the server keeps one row per game). */
export const postShare = (body: ShareBody) => api.post<ShareResultDto>('/api/shares', body)

/** `POST /api/shares/landing`: a visit through `?s=share`, logged and nothing more. */
export const postShareLanding = () => api.post<ShareLandingDto>('/api/shares/landing')
