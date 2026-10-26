import { Navigate } from 'react-router'
import { useIsMember, useMyNudge } from '../features/farm/useFarm'
import { useMe } from '../features/stats/useMe'

/**
 * `/` entry: resume the unfinished solo game if there is one; otherwise today's number with the nudge banner
 * when someone in the farm nudged the player (П4), or a new game.
 */
export function Home() {
  // Decide only on a profile fetched for this visit: the cached one may predate the latest game.
  const { data, isFetching } = useMe({ fresh: true })
  const member = useIsMember()
  const nudge = useMyNudge()
  if (!data || isFetching) return null
  if (data.currentGameId) return <Navigate to={`/play/${data.currentGameId}`} replace />
  // A failing nudge request (it retries in the background) never holds the game up.
  if (member && nudge.isPending && nudge.failureCount === 0) return null
  return <Navigate to={nudge.data ? '/today' : '/new'} replace />
}
