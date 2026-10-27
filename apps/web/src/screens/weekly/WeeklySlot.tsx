import { useNavigate } from 'react-router'
import { AwardHost } from '../../features/weekly/AwardHost'
import { useStartWeekly, useWeekly } from '../../features/weekly/useWeekly'
import { ctaOf } from '../../features/weekly/weeklyModel'
import { useNow } from '../../hooks/useNow'
import { sfx } from '../../lib/sound'
import { WeeklyCard } from './WeeklyCard'

const MINUTE_MS = 60_000

/**
 * П6 / ПД10 in „Нова игра“: the card for members (nothing for guests or while the week is unknown) and П8 on the
 * first visit after a week was finalised. „Играй“ starts or resumes today's game; „Утре пак“ opens the week.
 */
export function WeeklySlot() {
  const navigate = useNavigate()
  const query = useWeekly()
  const start = useStartWeekly()
  const now = useNow(MINUTE_MS)
  const week = query.data
  if (!week) return null
  return (
    <>
      <WeeklyCard
        week={week}
        now={now}
        busy={start.isPending}
        onPlay={() => {
          sfx.play('tap')
          if (ctaOf(week) === 'tomorrow') {
            void navigate('/weekly')
            return
          }
          start.mutate(undefined, {
            onSuccess: () => void navigate('/weekly/play'),
            onError: () => void navigate('/weekly'),
          })
        }}
      />
      <AwardHost week={week} />
    </>
  )
}
