import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router'
import { FALLBACK_HISTOGRAM } from '@bc/game-core'
import { Shell } from '../app/layouts/Shell'
import { shareFromResult } from '../features/share/shareModel'
import { ShareSheet } from '../features/share/ShareSheet'
import { distributionKind } from '../features/solo/api'
import { useDistribution } from '../features/stats/useDistribution'
import { useGameResult } from '../features/stats/useGameResult'
import { sfx } from '../lib/sound'
import { IDLE_SCENE } from './idleScene'
import { buildResult, isFinished, type ResultModel } from './result/resultModel'
import { ResultView } from './result/ResultView'

/** `sharing` starts with the share sheet open (dev gallery). */
function Loaded({ model, sharing = false }: { model: ResultModel; sharing?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(sharing)
  const share = useMemo(() => shareFromResult(model), [model])

  function openShare() {
    sfx.play('tap')
    setOpen(true)
  }

  return (
    <Shell scene={model.scene} screen="result" bare>
      <ResultView
        model={model}
        shareLabel={t('common.share')}
        onAgain={() => void navigate('/new')}
        onShare={openShare}
        onBoard={() => void navigate('/board')}
      />
      {open ? <ShareSheet model={share} onClose={() => setOpen(false)} /> : null}
    </Shell>
  )
}

export { Loaded as ResultLoaded }

function Pending({ message }: { message: string }) {
  return (
    <Shell scene={IDLE_SCENE} screen="result">
      <p role="status" style={{ fontWeight: 800, textAlign: 'center' }}>
        {message}
      </p>
    </Shell>
  )
}

export function Result() {
  const { t } = useTranslation()
  const { gameId } = useParams()
  const game = useGameResult(gameId)
  const finished = game.data && isFinished(game.data) ? game.data : null
  const dist = useDistribution(
    game.data?.len ?? 4,
    game.data?.zero ?? false,
    distributionKind(game.data?.kind ?? 'free'),
    finished !== null,
  )

  if (game.isError) return <Pending message={t('error.unknown')} />
  if (game.data && !finished) return <Navigate to={`/play/${game.data.id}`} replace />
  if (!finished) return <Pending message={t('common.loading')} />
  // A failed distribution request still leaves a usable (approximate) result.
  const histogram =
    dist.data ??
    (dist.isError
      ? { histogram: [...FALLBACK_HISTOGRAM[finished.len]], sample: 0, fallback: true }
      : null)
  if (!histogram) return <Pending message={t('common.loading')} />
  return <Loaded model={buildResult(finished, histogram)} />
}
