import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router'
import { FALLBACK_HISTOGRAM } from '@bc/game-core'
import { Shell } from '../app/layouts/Shell'
import { useDistribution } from '../features/stats/useDistribution'
import { useGameResult } from '../features/stats/useGameResult'
import { shareText } from '../lib/share'
import { sfx } from '../lib/sound'
import { IDLE_SCENE } from './idleScene'
import { buildResult, isFinished, type ResultModel } from './result/resultModel'
import { ResultView } from './result/ResultView'

const COPIED_MS = 1500

function shareMessage(t: ReturnType<typeof useTranslation>['t'], m: ResultModel): string {
  if (!m.won) return t('result.shareText.lose', { count: m.len })
  return t('result.shareText.win', { len: m.len, count: m.attempts, top: m.top })
}

function useCopiedLabel(): [boolean, () => void] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  function flash() {
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }
  return [copied, flash]
}

function Loaded({ model }: { model: ResultModel }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [copied, flash] = useCopiedLabel()

  async function share() {
    sfx.play('tap')
    if ((await shareText(shareMessage(t, model))) === 'copied') flash()
  }

  return (
    <Shell scene={model.scene}>
      <ResultView
        model={model}
        shareLabel={copied ? t('common.copied') : t('common.share')}
        onAgain={() => void navigate('/new')}
        onShare={() => void share()}
        onBoard={() => void navigate('/board')}
      />
    </Shell>
  )
}

function Pending({ message }: { message: string }) {
  return (
    <Shell scene={IDLE_SCENE}>
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
    game.data?.kind ?? 'free',
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
