import type { CreateGameBody, DistributionDto, GameViewDto, GuessResultDto } from '@bc/protocol'
import { api } from '../auth/client'

export type GameKind = CreateGameBody['kind']

export const createGame = (body: CreateGameBody) => api.post<GameViewDto>('/api/games', body)

export const fetchGame = (id: string) => api.get<GameViewDto>(`/api/games/${id}`)

export const startGame = (id: string) => api.post<{ startedAt: number }>(`/api/games/${id}/start`)

export const sendGuess = (id: string, guess: string) => api.post<GuessResultDto>(`/api/games/${id}/guesses`, { guess })

export const giveUpGame = (id: string) => api.post<{ secret: string }>(`/api/games/${id}/give-up`)

export function fetchDistribution(len: number, zero: boolean, kind: GameKind) {
  return api.get<DistributionDto>(`/api/stats/distribution?len=${len}&zero=${zero}&kind=${kind}`)
}
