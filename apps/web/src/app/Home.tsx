import { Navigate } from 'react-router'
import { useMe } from '../features/stats/useMe'

/** `/` entry: resume the unfinished solo game if there is one, otherwise start a new one. */
export function Home() {
  const { data } = useMe()
  if (!data) return null
  return <Navigate to={data.currentGameId ? `/play/${data.currentGameId}` : '/new'} replace />
}
