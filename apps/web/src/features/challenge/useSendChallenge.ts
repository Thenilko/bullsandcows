import type { CreateChallengeBody } from '@bc/protocol'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { saveInvite } from '../duel/api'
import { challengeApi } from './api'

/** Sends the challenge, keeps it like an invite (reload-safe) and opens the waiting screen. */
export function useSendChallenge() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (body: CreateChallengeBody) => challengeApi.create(body),
    onSuccess: (created) => {
      saveInvite(created)
      void navigate(`/duel/invite/${encodeURIComponent(created.code)}`, { state: created })
    },
  })
}
