import { Navigate } from 'react-router'
import { useMe } from '../features/stats/useMe'

/** `/` entry: resume the unfinished solo game if there is one, otherwise start a new one. */
export function Home() {
  // Decide only on a profile fetched for this visit: the cached one may predate the latest game.
  const { data, isFetching } = useMe({ fresh: true })
  if (!data || isFetching) return null
  return <Navigate to={data.currentGameId ? `/play/${data.currentGameId}` : '/new'} replace />
}
