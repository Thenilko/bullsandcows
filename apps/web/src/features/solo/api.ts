import type { CreateGameBody, DistributionDto, GameViewDto, GiveUpResultDto, GuessResultDto } from '@bc/protocol'
import { api } from '../auth/client'

export type GameKind = CreateGameBody['kind']

export const createGame = (body: CreateGameBody) => api.post<GameViewDto>('/api/games', body)

export const fetchGame = (id: string) => api.get<GameViewDto>(`/api/games/${id}`)

export const startGame = (id: string) => api.post<{ startedAt: number }>(`/api/games/${id}/start`)

/** `usedNotes`: the notebook was used in this game (for the „notes“ badge; sticky on the server). */
export const sendGuess = (id: string, guess: string, usedNotes: boolean) =>
  api.post<GuessResultDto>(`/api/games/${id}/guesses`, { guess, usedNotes })

export const giveUpGame = (id: string, usedNotes: boolean) => api.post<GiveUpResultDto>(`/api/games/${id}/give-up`, { usedNotes })

export function fetchDistribution(len: number, zero: boolean, kind: GameKind) {
  return api.get<DistributionDto>(`/api/stats/distribution?len=${len}&zero=${zero}&kind=${kind}`)
}
